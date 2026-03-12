/**
 * @aircraftworth/hedera-logger
 * HederaLogger — main class
 *
 * Wraps Hedera SDK for clean HCS logging and HTS minting.
 * Handles retries, batching, and async concurrency.
 */

import {
  Client,
  TopicMessageSubmitTransaction,
  TokenMintTransaction,
  PrivateKey,
  AccountId,
  TopicId,
  TokenId,
  Status,
} from '@hashgraph/sdk';

import type {
  HederaLoggerConfig,
  HCSLogOptions,
  HCSLogResult,
  HCSBatchResult,
  HTSMintOptions,
  HTSMintResult,
  KnownPayload,
} from './types';
import { ContractInteractor, ContractAddresses, DEFAULT_ADDRESSES } from './contracts';

export class HederaLogger {
  private client: Client;
  private config: Required<HederaLoggerConfig>;
  private queue: Array<() => Promise<void>> = [];
  private activeCount = 0;
  private contractInteractor?: ContractInteractor;

  constructor(config: HederaLoggerConfig) {
    this.config = {
      network: 'testnet',
      maxConcurrency: 5,
      debug: false,
      ...config,
    };

    // Build Hedera client
    this.client = this.config.network === 'mainnet'
      ? Client.forMainnet()
      : this.config.network === 'previewnet'
        ? Client.forPreviewnet()
        : Client.forTestnet();

    // Initialize contract interactor if addresses provided
    if (this.config.contracts) {
      this.contractInteractor = new ContractInteractor(
        this.client,
        this.config.contracts
      );
      this.contractInteractor.initializeContracts();
    }

    this.client.setOperator(
      AccountId.fromString(this.config.operatorId),
      PrivateKey.fromString(this.config.operatorKey),
    );

    if (this.config.debug) {
      console.debug('[HederaLogger] Initialised', {
        network: this.config.network,
        operator: this.config.operatorId,
      });
    }
  }

  // ── HCS ─────────────────────────────────────────────

  /**
   * Log a single structured payload to an HCS topic.
   *
   * @example
   * const result = await logger.log({
   *   topicId: '0.0.7968510',
   *   payload: { type: 'mlat_position', icao: 'ABC123', latitude: 51.48, longitude: -0.45, confidence: 0.91 }
   * })
   * console.log(result.sequenceNumber) // 47
   */
  async log(options: HCSLogOptions): Promise<HCSLogResult> {
    const {
      topicId,
      payload,
      memo,
      maxRetries = 3,
      retryDelayMs = 1000,
    } = options;

    const messageBytes = JSON.stringify({
      ...payload,
      _logged_at: new Date().toISOString(),
      _logger: '@aircraftworth/hedera-logger@0.1.0',
    });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const tx = new TopicMessageSubmitTransaction()
          .setTopicId(TopicId.fromString(topicId))
          .setMessage(messageBytes);

        if (memo) tx.setTransactionMemo(memo.slice(0, 100));

        const response = await tx.execute(this.client);
        const receipt = await response.getReceipt(this.client);

        if (receipt.status.toString() !== Status.Success.toString()) {
          throw new Error(`HCS submit failed: status ${receipt.status}`);
        }

        const result: HCSLogResult = {
          transactionId: response.transactionId.toString(),
          sequenceNumber: Number(receipt.topicSequenceNumber),
          consensusTimestamp: Date.now(),
          topicId,
          attempts: attempt,
        };

        if (this.config.debug) {
          console.debug('[HederaLogger] HCS logged', result);
        }

        return result;

      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < maxRetries) {
          const delay = retryDelayMs * Math.pow(2, attempt - 1);
          if (this.config.debug) {
            console.debug(`[HederaLogger] Retry ${attempt}/${maxRetries} in ${delay}ms:`, lastError.message);
          }
          await sleep(delay);
        }
      }
    }

    throw new Error(
      `HCS log failed after ${maxRetries} attempts: ${lastError?.message ?? 'unknown error'}`
    );
  }

  /**
   * Log multiple payloads to same topic in parallel (respecting maxConcurrency).
   * Partial failures are captured — succeeded results are not rolled back.
   *
   * @example
   * const { succeeded, failed } = await logger.logBatch({
   *   topicId: '0.0.7968510',
   *   payloads: positions.map(p => ({ type: 'mlat_position', ...p }))
   * })
   */
  async logBatch(options: {
    topicId: string;
    payloads: Record<string, unknown>[];
    memo?: string;
  }): Promise<HCSBatchResult> {
    const { topicId, payloads, memo } = options;

    const succeeded: HCSLogResult[] = [];
    const failed: HCSBatchResult['failed'] = [];

    // Chunk into maxConcurrency batches
    const chunks = chunk(payloads, this.config.maxConcurrency);

    for (const batch of chunks) {
      const results = await Promise.allSettled(
        batch.map(payload => this.log({ topicId, payload, memo }))
      );

      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          succeeded.push(result.value);
        } else {
          failed.push({
            payload: batch[i],
            error: result.reason?.message ?? 'unknown',
          });
        }
      });
    }

    return {
      succeeded,
      failed,
      totalSubmitted: payloads.length,
      totalFailed: failed.length,
    };
  }

  // ── HTS ─────────────────────────────────────────────

  /**
   * Mint a token (NFT or fungible) on Hedera HTS.
   * For Flight Track Tokens, metadata should include ICAO, timestamp, confidence.
   *
   * @example
   * const result = await logger.mint({
   *   tokenId: '0.0.98765',
   *   metadata: {
   *     icao: 'ABC123',
   *     latitude: 51.48,
   *     longitude: -0.45,
   *     confidence: 0.91,
   *     hcs_sequence: 47,
   *     timestamp: new Date().toISOString()
   *   }
   * })
   */
  async mint(options: HTSMintOptions): Promise<HTSMintResult> {
    const { tokenId, metadata, amount = 1 } = options;

    const metadataBytes = Buffer.from(JSON.stringify(metadata));

    const tx = new TokenMintTransaction()
      .setTokenId(TokenId.fromString(tokenId))
      .setAmount(amount)
      .addMetadata(metadataBytes);

    const response = await tx.execute(this.client);
    const receipt = await response.getReceipt(this.client);

    if (receipt.status.toString() !== Status.Success.toString()) {
      throw new Error(`HTS mint failed: status ${receipt.status}`);
    }

    return {
      transactionId: response.transactionId.toString(),
      serials: receipt.serials.map(s => Number(s)),
      tokenId,
      newTotalSupply: Number(receipt.totalSupply),
    };
  }

  // ── Contract Integration Methods ─────────────────────────────

  /**
   * Create a new data offering on marketplace
   */
  async createOffering(data: {
    price: string;
    dataType: string;
    duration: number;
    description: string;
    minConfidence?: number;
    minSensors?: number;
    maxPurchases?: number;
  }): Promise<any> {
    if (!this.contractInteractor) {
      throw new Error('Contract interactor not initialized. Provide contracts in config.');
    }

    return await this.contractInteractor.createOffering(data);
  }

  /**
   * Purchase a data offering
   */
  async purchaseOffering(offeringId: number, amount: string): Promise<any> {
    if (!this.contractInteractor) {
      throw new Error('Contract interactor not initialized. Provide contracts in config.');
    }

    return await this.contractInteractor.purchaseOffering(offeringId, amount);
  }

  /**
   * Submit an operator review
   */
  async submitReview(data: {
    operator: string;
    rating: number;
    comment: string;
  }): Promise<any> {
    if (!this.contractInteractor) {
      throw new Error('Contract interactor not initialized. Provide contracts in config.');
    }

    return await this.contractInteractor.submitReview(data);
  }

  /**
   * Update operator reputation
   */
  async updateReputation(data: {
    operator: string;
    newScore: number;
    reason: string;
  }): Promise<any> {
    if (!this.contractInteractor) {
      throw new Error('Contract interactor not initialized. Provide contracts in config.');
    }

    return await this.contractInteractor.updateReputation(data);
  }

  /**
   * Get offering details
   */
  async getOffering(offeringId: number): Promise<any> {
    if (!this.contractInteractor) {
      throw new Error('Contract interactor not initialized. Provide contracts in config.');
    }

    return await this.contractInteractor.getOffering(offeringId);
  }

  /**
   * Get active offerings
   */
  async getActiveOfferings(offset = 0, limit = 50): Promise<any[]> {
    if (!this.contractInteractor) {
      throw new Error('Contract interactor not initialized. Provide contracts in config.');
    }

    return await this.contractInteractor.getActiveOfferings(offset, limit);
  }

  /**
   * Get operator reputation
   */
  async getReputation(operator: string): Promise<any> {
    if (!this.contractInteractor) {
      throw new Error('Contract interactor not initialized. Provide contracts in config.');
    }

    return await this.contractInteractor.getReputation(operator);
  }

  /**
   * Get reputation tier
   */
  async getReputationTier(operator: string): Promise<string> {
    if (!this.contractInteractor) {
      throw new Error('Contract interactor not initialized. Provide contracts in config.');
    }

    return await this.contractInteractor.getReputationTier(operator);
  }

  /**
   * Check if operator is trusted
   */
  async isTrustedOperator(operator: string): Promise<boolean> {
    if (!this.contractInteractor) {
      throw new Error('Contract interactor not initialized. Provide contracts in config.');
    }

    return await this.contractInteractor.isTrustedOperator(operator);
  }

  /**
   * Listen to contract events
   */
  onContractEvent(callback: (event: any) => void): void {
    if (!this.contractInteractor) {
      console.warn('Contract interactor not initialized. Event listening disabled.');
      return;
    }

    this.contractInteractor.listenToEvents(callback);
  }

  /**
   * Stop listening to contract events
   */
  stopContractEvents(): void {
    if (this.contractInteractor) {
      this.contractInteractor.stopListening();
    }
  }

  /**
   * Log contract event to HCS
   */
  async logContractEvent(event: any): Promise<HCSLogResult> {
    return this.log({
      topicId: this.config.topicId || '0.0.7968510',
      payload: {
        type: 'contract_interaction',
        contract_type: event.type,
        function_name: event.event,
        parameters: event.data,
        result: { timestamp: new Date().toISOString() },
        network: this.config.network
      }
    });
  }

  // ── Convenience helpers ───────────────────────────────

  /**
   * Log an MLAT position to HCS and optionally mint a Flight Track Token.
   * Mirrors AircraftWorth pipeline exactly.
   *
   * @example
   * const { log, token } = await logger.logMLATPosition({
   *   topicId: '0.0.7968510',
   *   tokenId: '0.0.98765', // omit to skip minting
   *   position: {
   *     icao: 'ABC123',
   *     latitude: 51.4820,
   *     longitude: -0.1234,
   *     confidence: 0.91,
   *     sensorIds: ['S1','S2','S4','S7'],
   *     method: 'TDOA',
   *     supabaseRowId: 1234
   *   },
   *   mintThreshold: 0.90  // only mint if confidence >= this
   * })
   */
  async logMLATPosition(options: {
    topicId: string;
    tokenId?: string;
    position: {
      icao: string;
      latitude: number;
      longitude: number;
      altitude_ft?: number;
      confidence: number;
      sensorIds: string[];
      method: string;
      residualError?: number;
      supabaseRowId?: string | number;
    };
    mintThreshold?: number;
  }): Promise<{ log: HCSLogResult; token: HTSMintResult | null }> {
    const { topicId, tokenId, position, mintThreshold = 0.9 } = options;

    const payload: Record<string, unknown> = {
      type: 'mlat_position',
      icao: position.icao,
      latitude: position.latitude,
      longitude: position.longitude,
      altitude_ft: position.altitude_ft,
      confidence: position.confidence,
      sensor_ids: position.sensorIds,
      sensor_count: position.sensorIds.length,
      calculation_method: position.method,
      residual_error: position.residualError,
      supabase_row_id: position.supabaseRowId,
      timestamp: new Date().toISOString(),
    };

    const logResult = await this.log({ topicId, payload });

    let mintResult: HTSMintResult | null = null;

    if (
      tokenId &&
      position.confidence >= mintThreshold &&
      position.sensorIds.length >= 4
    ) {
      mintResult = await this.mint({
        tokenId,
        metadata: {
          icao: position.icao,
          latitude: position.latitude,
          longitude: position.longitude,
          confidence: position.confidence,
          hcs_sequence: logResult.sequenceNumber,
          sensor_count: position.sensorIds.length,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return { log: logResult, token: mintResult };
  }

  /**
   * Create a new HCS topic (for setup/initialization).
   * Returns new topic ID as a string.
   */
  async createTopic(memo?: string): Promise<string> {
    const { TopicCreateTransaction } = await import('@hashgraph/sdk');

    const tx = new TopicCreateTransaction();
    if (memo) tx.setTopicMemo(memo.slice(0, 100));

    const response = await tx.execute(this.client);
    const receipt = await response.getReceipt(this.client);

    const topicId = receipt.topicId?.toString();
    if (!topicId) throw new Error('Topic creation failed — no topic ID in receipt');

    return topicId;
  }

  /** Clean up Hedera client connection */
  async close(): Promise<void> {
    await this.client.close();
  }
}

// ── Utilities ────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
