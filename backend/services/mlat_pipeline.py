from __future__ import annotations

import asyncio
import httpx
import os
from datetime import datetime, timezone
from typing import Dict, List

from models import AircraftPosition, MLATProcessRequest, MLATProcessResponse, ModeSMessage
from services.hedera_service import HederaService
from services.mlat_solver import MLATSolver
from services.supabase_service import SupabaseService


class MLATPipelineService:
    """Coordinates ingestion, MLAT solving, and persistence."""

    def __init__(self) -> None:
        self.supabase = SupabaseService()
        self.solver = MLATSolver()
        self.hedera = HederaService()
        self.min_sensors = int(os.getenv("MLAT_MIN_SENSORS", "3"))
        self.confidence_threshold = float(os.getenv("MLAT_CONFIDENCE_THRESHOLD", "80"))
        self._local_messages: List[Dict] = []

    async def _trigger_ai_analysis(self, icao: str, position: AircraftPosition, recent_track: List[Dict]) -> None:
        """Fire-and-forget Groq analysis. Never blocks the MLAT pipeline."""
        try:
            # Prepare track data for AI analysis
            track_data = [
                {
                    "lat": p["latitude"],
                    "lon": p["longitude"],
                    "alt_ft": p.get("altitude_ft"),
                    "confidence": p.get("confidence_score", 0),
                    "timestamp_iso": p.get("calculated_at", datetime.now(timezone.utc).isoformat())
                }
                for p in recent_track[-8:]  # Last 8 positions
            ]

            payload = {
                "icao": icao,
                "has_adsb": False,  # Default to False since ADSB status not tracked
                "sensor_count": position.sensorCount or 0,
                "track": track_data,
            }

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "http://localhost:8000/api/intelligence/analyse-track",
                    json=payload, timeout=5.0
                )
                result = resp.json()

                # Store AI assessment in Supabase alongside the position
                if self.supabase.is_configured:
                    await asyncio.to_thread(
                        self.supabase.update_aircraft_position_ai,
                        icao,
                        result.get("threat_level", "unknown"),
                        result.get("summary", ""),
                        result.get("tags", [])
                    )

        except Exception as e:
            # Never crash the MLAT pipeline for AI failures
            import logging
            logging.warning(f"AI analysis failed for {icao}: {e}")

    # ------------------------------------------------------------------
    # Ingestion
    # ------------------------------------------------------------------
    async def ingest_messages(self, messages: List[ModeSMessage]) -> int:
        if not messages:
            return 0

        if self.supabase.is_configured:
            count = await asyncio.to_thread(self.supabase.batch_store_mode_s_messages, messages)
        else:
            self._local_messages.extend([msg.model_dump() for msg in messages])
            count = len(messages)
        return count

    # ------------------------------------------------------------------
    # Processing
    # ------------------------------------------------------------------
    async def process_mlat(self, request: MLATProcessRequest) -> MLATProcessResponse:
        ingested = 0
        if request.messages:
            ingested = await self.ingest_messages(request.messages)

        observations = await self._get_recent_observations(request.icaoAddress, request.timeWindowMs)
        if len(observations) < self.min_sensors:
            return MLATProcessResponse(
                success=False,
                message=f"Need at least {self.min_sensors} unique sensors, found {len(observations)}",
                storedMessageCount=ingested,
            )

        solution = self.solver.solve_position(observations)
        if not solution:
            return MLATProcessResponse(
                success=False,
                message="Unable to solve MLAT for provided observations",
                storedMessageCount=ingested,
            )

        calculated_at = datetime.now(timezone.utc).isoformat()
        position = AircraftPosition(
            icaoAddress=request.icaoAddress.upper(),
            latitude=solution["latitude"],
            longitude=solution["longitude"],
            altitudeFt=None,
            confidenceScore=solution["confidence_score"],
            sensorCount=solution["sensor_count"],
            calculationMethod="TDOA",
            calculatedAt=calculated_at,
        )

        hedera_sequence = None
        token_id = None
        
        if self.hedera.client:
            # Enhanced Hedera log payload with sensor IDs and metadata
            sensor_ids = [obs["sensor_id"] for obs in observations]
            log_payload = {
                "type": "mlat_position",
                "icao": position.icaoAddress,
                "latitude": position.latitude,
                "longitude": position.longitude,
                "altitude_ft": position.altitudeFt,
                "confidence": position.confidenceScore,
                "sensor_count": position.sensorCount,
                "sensor_ids": sensor_ids,
                "calculation_method": position.calculationMethod,
                "timestamp": calculated_at,
            }
            hedera_sequence = await self.hedera.log_evaluation(log_payload)
            position.hederaSequenceNumber = hedera_sequence
            
            # Mint Flight Track Token for high-confidence positions
            if position.confidenceScore >= 90 and position.sensorCount >= 4:
                try:
                    token_id = await self.hedera.mint_skill_token(
                        user_id=os.getenv("HEDERA_OPERATOR_ID", "0.0.0"),
                        skill_worth=int(position.confidenceScore)
                    )
                    position.flightTrackTokenId = token_id
                except Exception as e:
                    import logging
                    logging.warning(f"Failed to mint Flight Track Token: {e}")

        if self.supabase.is_configured:
            await asyncio.to_thread(self.supabase.store_aircraft_position, position)

        # Trigger AI analysis in background (fire-and-forget)
        recent_track = await self._get_recent_track_for_ai(position.icaoAddress)
        asyncio.create_task(self._trigger_ai_analysis(position.icaoAddress, position, recent_track))

        message = "MLAT solution computed"
        if position.confidenceScore < self.confidence_threshold:
            message += f" (confidence below threshold {self.confidence_threshold}%)"

        return MLATProcessResponse(
            success=True,
            message=message,
            position=position,
            storedMessageCount=ingested,
            hederaSequenceNumber=hedera_sequence,
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    async def _get_recent_observations(self, icao_address: str, time_window_ms: int) -> List[Dict]:
        if self.supabase.is_configured:
            rows = await asyncio.to_thread(self.supabase.fetch_recent_messages, icao_address, time_window_ms)
            return [
                {
                    "sensor_id": row.get("sensor_id"),
                    "latitude": row.get("sensor_lat"),
                    "longitude": row.get("sensor_lon"),
                    "timestamp_ns": row.get("timestamp_ns"),
                    "altitude_m": row.get("sensor_alt_m"),
                }
                for row in rows
                if row.get("sensor_lat") is not None and row.get("sensor_lon") is not None
            ]

        # Local fallback storage
        filtered = [
            row
            for row in self._local_messages
            if row["icaoAddress"].lower() == icao_address.lower()
        ]
        if not filtered:
            return []

        return [
            {
                "sensor_id": row.get("sensor_id"),
                "latitude": row.get("sensor_lat"),
                "longitude": row.get("sensor_lon"),
                "timestamp_ns": row.get("timestamp_ns"),
                "altitude_m": row.get("sensor_alt_m"),
            }
            for row in filtered[-50:]  # Last 50 messages
        ]

    async def _get_recent_track_for_ai(self, icao_address: str) -> List[Dict]:
        """Get recent aircraft positions for AI analysis."""
        if self.supabase.is_configured:
            try:
                rows = await asyncio.to_thread(
                    self.supabase.fetch_recent_positions, 
                    icao_address, 
                    limit=8  # Last 8 positions for AI
                )
                return [
                    {
                        "latitude": row.get("latitude"),
                        "longitude": row.get("longitude"),
                        "altitude_ft": row.get("altitude_ft"),
                        "confidence_score": row.get("confidence_score"),
                        "calculated_at": row.get("calculated_at"),
                    }
                    for row in rows
                    if row.get("latitude") is not None and row.get("longitude") is not None
                ]
            except Exception:
                return []
        return []

    def health(self) -> Dict[str, bool]:
        return {
            "supabase": self.supabase.is_configured,
            "hedera": self.hedera.client is not None,
        }
