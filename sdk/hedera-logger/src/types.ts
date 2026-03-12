/**
 * @aircraftworth/hedera-logger
 * Core type definitions
 */

// ── HCS ──────────────────────────────────────────────

export interface HCSLogOptions {
  /** Hedera topic ID to submit to (e.g. "0.0.7968510") */
  topicId: string;
  /** Structured payload to log. Will be JSON-serialised. */
  payload: Record<string, unknown>;
  /** Optional memo attached to transaction (max 100 bytes) */
  memo?: string;
  /** Max retry attempts on transient failures. Default: 3 */
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface HCSLogResult {
  success: boolean;
  transactionId: string;
  sequenceNumber: bigint;
  error?: string;
}

export interface HCSBatchResult {
  succeeded: HCSLogResult[];
  failed: Array<{
    payload: Record<string, unknown>;
    error: string;
  }>;
  totalSubmitted: number;
  totalFailed: number;
}

export interface HTSMintOptions {
  tokenId: string;
  metadata: Record<string, unknown>;
  amount?: number;
}

export interface HTSMintResult {
  success: boolean;
  transactionId: string;
  serials: number[];
  tokenId: string;
  newTotalSupply: number;
  error?: string;
}

// ── Logger config ─────────────────────────────────────

export interface HederaLoggerConfig {
  /** Hedera operator account ID (e.g. "0.0.6324974") */
  operatorId: string;
  /** Hedera operator private key (DER-encoded hex or raw) */
  operatorKey: string;
  /** Network to connect to. Default: "testnet" */
  network?: 'mainnet' | 'testnet' | 'previewnet';
  /** Max concurrent HCS submissions. Default: 5 */
  maxConcurrency?: number;
  /** Whether to log SDK debug output. Default: false */
  debug?: boolean;
}

// ── Built-in payload schemas ──────────────────────────────────

/** Standard schema for MLAT position logs (matches AircraftWorth HCS format) */
export interface MLATPositionPayload extends Record<string, unknown> {
  type: 'mlat_position';
  icao: string;
  latitude: number;
  longitude: number;
  altitude_ft?: number;
  confidence: number;
  sensor_ids: string[];
  sensor_count: number;
  calculation_method: string;
  residual_error?: number;
  supabase_row_id?: string | number;
  timestamp: string; // ISO-8601
}

/** Standard schema for sensor event logs */
export interface SensorEventPayload extends Record<string, unknown> {
  type: 'sensor_event';
  sensor_id: string;
  event: 'online' | 'offline' | 'degraded';
  trust_score?: number;
  timestamp: string;
}

/** Generic event schema — use for custom applications */
export interface GenericEventPayload extends Record<string, unknown> {
  type: string;
  [key: string]: unknown;
}

// Contract interaction types
export interface ContractAddresses {
  marketplace?: string;
  escrow?: string;
  reputation?: string;
}

export interface ContractEvent {
  type: 'marketplace' | 'reputation' | 'escrow';
  event: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

export interface OfferingData {
  price: string; // in HBAR
  dataType: string;
  duration: number; // in seconds
  description: string;
  minConfidence?: number;
  minSensors?: number;
  maxPurchases?: number;
}

export interface PurchaseData {
  offeringId: number;
  amount: string; // in HBAR
}

export interface ReviewData {
  operator: string;
  rating: number; // 1-5 stars
  comment: string;
}

export interface ReputationUpdate {
  operator: string;
  newScore: number;
  reason: string;
}

export type KnownPayload =
  | MLATPositionPayload
  | SensorEventPayload
  | GenericEventPayload;
