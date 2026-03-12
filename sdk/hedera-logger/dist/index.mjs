// src/logger.ts
import {
  Client,
  TopicMessageSubmitTransaction,
  TokenMintTransaction,
  PrivateKey,
  AccountId,
  TopicId,
  TokenId,
  Status
} from "@hashgraph/sdk";
var HederaLogger = class {
  constructor(config) {
    this.queue = [];
    this.activeCount = 0;
    this.config = {
      network: "testnet",
      maxConcurrency: 5,
      debug: false,
      ...config
    };
    this.client = this.config.network === "mainnet" ? Client.forMainnet() : this.config.network === "previewnet" ? Client.forPreviewnet() : Client.forTestnet();
    this.client.setOperator(
      AccountId.fromString(this.config.operatorId),
      PrivateKey.fromString(this.config.operatorKey)
    );
    if (this.config.debug) {
      console.debug("[HederaLogger] Initialised", {
        network: this.config.network,
        operator: this.config.operatorId
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
  async log(options) {
    const {
      topicId,
      payload,
      memo,
      maxRetries = 3,
      retryDelayMs = 1e3
    } = options;
    const messageBytes = JSON.stringify({
      ...payload,
      _logged_at: (/* @__PURE__ */ new Date()).toISOString(),
      _logger: "@aircraftworth/hedera-logger@0.1.0"
    });
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const tx = new TopicMessageSubmitTransaction().setTopicId(TopicId.fromString(topicId)).setMessage(messageBytes);
        if (memo) tx.setTransactionMemo(memo.slice(0, 100));
        const response = await tx.execute(this.client);
        const receipt = await response.getReceipt(this.client);
        if (receipt.status.toString() !== Status.Success.toString()) {
          throw new Error(`HCS submit failed: status ${receipt.status}`);
        }
        const result = {
          transactionId: response.transactionId.toString(),
          sequenceNumber: Number(receipt.topicSequenceNumber),
          consensusTimestamp: Date.now(),
          topicId,
          attempts: attempt
        };
        if (this.config.debug) {
          console.debug("[HederaLogger] HCS logged", result);
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
      `HCS log failed after ${maxRetries} attempts: ${lastError?.message ?? "unknown error"}`
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
  async logBatch(options) {
    const { topicId, payloads, memo } = options;
    const succeeded = [];
    const failed = [];
    const chunks = chunk(payloads, this.config.maxConcurrency);
    for (const batch of chunks) {
      const results = await Promise.allSettled(
        batch.map((payload) => this.log({ topicId, payload, memo }))
      );
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          succeeded.push(result.value);
        } else {
          failed.push({
            payload: batch[i],
            error: result.reason?.message ?? "unknown"
          });
        }
      });
    }
    return {
      succeeded,
      failed,
      totalSubmitted: payloads.length,
      totalFailed: failed.length
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
  async mint(options) {
    const { tokenId, metadata, amount = 1 } = options;
    const metadataBytes = Buffer.from(JSON.stringify(metadata));
    const tx = new TokenMintTransaction().setTokenId(TokenId.fromString(tokenId)).setAmount(amount).addMetadata(metadataBytes);
    const response = await tx.execute(this.client);
    const receipt = await response.getReceipt(this.client);
    if (receipt.status.toString() !== Status.Success.toString()) {
      throw new Error(`HTS mint failed: status ${receipt.status}`);
    }
    return {
      transactionId: response.transactionId.toString(),
      serials: receipt.serials.map((s) => Number(s)),
      tokenId,
      newTotalSupply: Number(receipt.totalSupply)
    };
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
  async logMLATPosition(options) {
    const { topicId, tokenId, position, mintThreshold = 0.9 } = options;
    const payload = {
      type: "mlat_position",
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
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    const logResult = await this.log({ topicId, payload });
    let mintResult = null;
    if (tokenId && position.confidence >= mintThreshold && position.sensorIds.length >= 4) {
      mintResult = await this.mint({
        tokenId,
        metadata: {
          icao: position.icao,
          latitude: position.latitude,
          longitude: position.longitude,
          confidence: position.confidence,
          hcs_sequence: logResult.sequenceNumber,
          sensor_count: position.sensorIds.length,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    }
    return { log: logResult, token: mintResult };
  }
  /**
   * Create a new HCS topic (for setup/initialization).
   * Returns new topic ID as a string.
   */
  async createTopic(memo) {
    const { TopicCreateTransaction } = await import("@hashgraph/sdk");
    const tx = new TopicCreateTransaction();
    if (memo) tx.setTopicMemo(memo.slice(0, 100));
    const response = await tx.execute(this.client);
    const receipt = await response.getReceipt(this.client);
    const topicId = receipt.topicId?.toString();
    if (!topicId) throw new Error("Topic creation failed \u2014 no topic ID in receipt");
    return topicId;
  }
  /** Clean up Hedera client connection */
  async close() {
    await this.client.close();
  }
};
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// src/index.ts
var VERSION = "0.1.0";
export {
  HederaLogger,
  VERSION
};
