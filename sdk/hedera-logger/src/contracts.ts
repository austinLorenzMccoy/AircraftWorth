/**
 * @aircraftworth/hedera-logger - Contract Integration
 * Smart contract integration for marketplace, escrow, and reputation
 */

import { ethers } from 'ethers';

// Contract ABIs
export const AircraftMarketplaceABI = require("../../contracts/abis/AircraftMarketplace.json");
export const EscrowServiceABI = require("../../contracts/abis/EscrowService.json");
export const ReputationSystemABI = require("../../contracts/abis/ReputationSystem.json");

// Contract interfaces
export interface ContractAddresses {
  marketplace?: string;
  escrow?: string;
  reputation?: string;
}

export interface OfferingData {
  price: string; // in HBAR
  dataType: string;
  duration: number; // in seconds
  description: string;
  minConfidence: number;
  minSensors: number;
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

// Contract interaction helpers
export class ContractInteractor {
  private signer: any;
  private addresses: ContractAddresses;
  private contracts: {
    marketplace?: any;
    escrow?: any;
    reputation?: any;
  };

  constructor(signer: any, addresses: ContractAddresses = {}) {
    this.signer = signer;
    this.addresses = addresses;
    this.contracts = {};
  }

  /**
   * Initialize contract instances
   */
  initializeContracts() {
    if (this.addresses.marketplace && AircraftMarketplaceABI.length > 0) {
      this.contracts.marketplace = new ethers.Contract(
        this.addresses.marketplace,
        AircraftMarketplaceABI,
        this.signer
      );
    }

    if (this.addresses.escrow && EscrowServiceABI.length > 0) {
      this.contracts.escrow = new ethers.Contract(
        this.addresses.escrow,
        EscrowServiceABI,
        this.signer
      );
    }

    if (this.addresses.reputation && ReputationSystemABI.length > 0) {
      this.contracts.reputation = new ethers.Contract(
        this.addresses.reputation,
        ReputationSystemABI,
        this.signer
      );
    }
  }

  /**
   * Create a new data offering
   */
  async createOffering(data: OfferingData): Promise<any> {
    if (!this.contracts.marketplace) {
      throw new Error('Marketplace contract not initialized');
    }

    const priceInTinybars = ethers.utils.parseUnits(data.price, 'ether'); // 8 decimals for HBAR
    
    return await this.contracts.marketplace.createOffering(
      priceInTinybars,
      data.dataType,
      data.duration,
      data.description,
      data.minConfidence,
      data.minSensors,
      100 // max purchases
    );
  }

  /**
   * Purchase a data offering
   */
  async purchaseOffering(offeringId: number, amount: string): Promise<any> {
    if (!this.contracts.marketplace) {
      throw new Error('Marketplace contract not initialized');
    }

    const amountInTinybars = ethers.utils.parseUnits(amount, 'ether');
    
    return await this.contracts.marketplace.purchaseOffering(offeringId, {
      value: amountInTinybars
    });
  }

  /**
   * Submit an operator review
   */
  async submitReview(data: ReviewData): Promise<any> {
    if (!this.contracts.reputation) {
      throw new Error('Reputation contract not initialized');
    }

    return await this.contracts.reputation.submitReview(
      data.operator,
      data.rating,
      data.comment
    );
  }

  /**
   * Update operator reputation
   */
  async updateReputation(data: ReputationUpdate): Promise<any> {
    if (!this.contracts.reputation) {
      throw new Error('Reputation contract not initialized');
    }

    return await this.contracts.reputation.updateReputation(
      data.operator,
      data.newScore,
      data.reason
    );
  }

  /**
   * Get offering details
   */
  async getOffering(offeringId: number): Promise<any> {
    if (!this.contracts.marketplace) {
      throw new Error('Marketplace contract not initialized');
    }

    return await this.contracts.marketplace.getOffering(offeringId);
  }

  /**
   * Get active offerings
   */
  async getActiveOfferings(offset = 0, limit = 50): Promise<any[]> {
    if (!this.contracts.marketplace) {
      throw new Error('Marketplace contract not initialized');
    }

    return await this.contracts.marketplace.getActiveOfferings(offset, limit);
  }

  /**
   * Get operator reputation
   */
  async getReputation(operator: string): Promise<any> {
    if (!this.contracts.reputation) {
      throw new Error('Reputation contract not initialized');
    }

    return await this.contracts.reputation.getReputationScore(operator);
  }

  /**
   * Get reputation tier
   */
  async getReputationTier(operator: string): Promise<string> {
    if (!this.contracts.reputation) {
      throw new Error('Reputation contract not initialized');
    }

    return await this.contracts.reputation.getReputationTier(operator);
  }

  /**
   * Check if operator is trusted
   */
  async isTrustedOperator(operator: string): Promise<boolean> {
    if (!this.contracts.reputation) {
      throw new Error('Reputation contract not initialized');
    }

    return await this.contracts.reputation.isTrustedOperator(operator);
  }

  /**
   * Listen to contract events
   */
  listenToEvents(callback: (event: any) => void) {
    if (!this.contracts.marketplace) return;

    // Marketplace events
    this.contracts.marketplace.on('OfferingCreated', (offeringId, seller, price, dataType, duration) => {
      callback({
        type: 'marketplace',
        event: 'OfferingCreated',
        data: { offeringId, seller, price: ethers.utils.formatUnits(price, 'ether'), dataType, duration }
      });
    });

    this.contracts.marketplace.on('PurchaseInitiated', (purchaseId, offeringId, buyer, amount) => {
      callback({
        type: 'marketplace',
        event: 'PurchaseInitiated',
        data: { purchaseId, offeringId, buyer, amount: ethers.utils.formatUnits(amount, 'ether') }
      });
    });

    this.contracts.marketplace.on('PurchaseCompleted', (purchaseId, offeringId, buyer, seller) => {
      callback({
        type: 'marketplace',
        event: 'PurchaseCompleted',
        data: { purchaseId, offeringId, buyer, seller }
      });
    });

    // Reputation events
    if (this.contracts.reputation) {
      this.contracts.reputation.on('ReputationUpdated', (operator, oldScore, newScore, reason, updatedBy) => {
        callback({
          type: 'reputation',
          event: 'ReputationUpdated',
          data: { operator, oldScore, newScore, reason, updatedBy }
        });
      });

      this.contracts.reputation.on('ReviewSubmitted', (reviewId, reviewer, operator, rating, comment) => {
        callback({
          type: 'reputation',
          event: 'ReviewSubmitted',
          data: { reviewId, reviewer, operator, rating, comment }
        });
      });
    }
  }

  /**
   * Stop listening to events
   */
  stopListening() {
    if (this.contracts.marketplace) {
      this.contracts.marketplace.removeAllListeners();
    }
    if (this.contracts.reputation) {
      this.contracts.reputation.removeAllListeners();
    }
  }
}

// Default contract addresses (mock deployment)
export const DEFAULT_ADDRESSES: ContractAddresses = {
  marketplace: "0.0.1234567",
  escrow: "0.0.1234568", 
  reputation: "0.0.1234569"
};
