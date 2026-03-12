"use client";

import { useState, useEffect } from "react";
import { HederaLogger } from "@aircraftworth/hedera-logger";

export default function MarketplaceIntegration() {
  const [logger, setLogger] = useState<HederaLogger | null>(null);
  const [offerings, setOfferings] = useState<any[]>([]);
  const [reputation, setReputation] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    // Initialize HederaLogger with contract addresses
    const initLogger = async () => {
      try {
        const hederaLogger = new HederaLogger({
          operatorId: process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID || "",
          operatorKey: process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY || "",
          contracts: {
            marketplace: "0.0.1234567",
            escrow: "0.0.1234568",
            reputation: "0.0.1234569"
          }
        });

        setLogger(hederaLogger);

        // Listen to contract events
        hederaLogger.onContractEvent((event) => {
          setEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events
        });

        // Load initial data
        await loadInitialData(hederaLogger);
      } catch (error) {
        console.error("Failed to initialize HederaLogger:", error);
      }
    };

    initLogger();
  }, []);

  const loadInitialData = async (hederaLogger: HederaLogger) => {
    try {
      // Get active offerings
      const activeOfferings = await hederaLogger.getActiveOfferings(0, 10);
      setOfferings(activeOfferings);

      // Get operator reputation
      const operatorReputation = await hederaLogger.getReputation("0.0.6324974");
      setReputation(operatorReputation);
    } catch (error) {
      console.error("Failed to load initial data:", error);
    }
  };

  const createOffering = async () => {
    if (!logger) return;

    try {
      await logger.createOffering({
        price: "1.0",
        dataType: "mlat_positions",
        duration: 86400,
        description: "High-quality MLAT positions",
        minConfidence: 90,
        minSensors: 4
      });

      // Refresh offerings
      await loadInitialData(logger);
    } catch (error) {
      console.error("Failed to create offering:", error);
    }
  };

  const purchaseOffering = async (offeringId: number) => {
    if (!logger) return;

    try {
      await logger.purchaseOffering(offeringId, "1.0");
      
      // Refresh data
      await loadInitialData(logger);
    } catch (error) {
      console.error("Failed to purchase offering:", error);
    }
  };

  const submitReview = async () => {
    if (!logger) return;

    try {
      await logger.submitReview({
        operator: "0.0.6324974",
        rating: 5,
        comment: "Excellent data quality and reliability!"
      });

      // Refresh reputation
      const operatorReputation = await logger.getReputation("0.0.6324974");
      setReputation(operatorReputation);
    } catch (error) {
      console.error("Failed to submit review:", error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">AircraftWorth Marketplace</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contract Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Contract Actions</h2>
          
          <div className="space-y-4">
            <button
              onClick={createOffering}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Create Offering
            </button>
            
            <button
              onClick={submitReview}
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Submit Review
            </button>
          </div>
        </div>

        {/* Reputation Display */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Operator Reputation</h2>
          
          {reputation ? (
            <div className="space-y-2">
              <p><strong>Total Score:</strong> {reputation.totalScore}</p>
              <p><strong>Reviews:</strong> {reputation.reviewCount}</p>
              <p><strong>Successful:</strong> {reputation.successfulTransactions}</p>
              <p><strong>Failed:</strong> {reputation.failedTransactions}</p>
              <p><strong>Tier:</strong> {reputation.totalScore >= 700 ? 'Gold' : reputation.totalScore >= 500 ? 'Silver' : 'Bronze'}</p>
            </div>
          ) : (
            <p>Loading reputation...</p>
          )}
        </div>
      </div>

      {/* Active Offerings */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Active Offerings</h2>
        
        {offerings.length > 0 ? (
          <div className="space-y-4">
            {offerings.map((offering, index) => (
              <div key={index} className="border rounded p-4">
                <h3 className="font-semibold">{offering.dataType}</h3>
                <p>{offering.description}</p>
                <p><strong>Price:</strong> {offering.price} HBAR</p>
                <p><strong>Duration:</strong> {offering.duration} seconds</p>
                <button
                  onClick={() => purchaseOffering(offering.id)}
                  className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                >
                  Purchase
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>No active offerings</p>
        )}
      </div>

      {/* Contract Events */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Events</h2>
        
        {events.length > 0 ? (
          <div className="space-y-2">
            {events.map((event, index) => (
              <div key={index} className="text-sm border-b pb-2">
                <span className="font-semibold">{event.event}</span>
                <span className="ml-2 text-gray-600">{event.type}</span>
                <p className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No events yet</p>
        )}
      </div>
    </div>
  );
}
