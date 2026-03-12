/**
 * @aircraftworth/hedera-logger
 * Core type definitions
 */
interface HCSLogOptions {
    /** Hedera topic ID to submit to (e.g. "0.0.7968510") */
    topicId: string;
    /** Structured payload to log. Will be JSON-serialised. */
    payload: Record<string, unknown>;
    /** Optional memo attached to transaction (max 100 bytes) */
    memo?: string;
    /** Max retry attempts on transient failures. Default: 3 */
    maxRetries?: number;
    /** Base delay in ms for exponential backoff. Default: 1000 */
    retryDelayMs?: number;
}
interface HCSLogResult {
    /** Hedera transaction ID (e.g. "0.0.6324974@1771516539.223000412") */
    transactionId: string;
    /** HCS sequence number assigned to this message */
    sequenceNumber: number;
    /** Unix timestamp (ms) when message was accepted */
    consensusTimestamp: number;
    /** The topic ID message was submitted to */
    topicId: string;
    /** How many attempts were needed (1 = first try) */
    attempts: number;
}
interface HCSBatchResult {
    succeeded: HCSLogResult[];
    failed: Array<{
        payload: Record<string, unknown>;
        error: string;
    }>;
    totalSubmitted: number;
    totalFailed: number;
}
interface HTSMintOptions {
    /** HTS token ID to mint supply on (e.g. "0.0.12345") */
    tokenId: string;
    /** Token metadata as a plain object — will be serialised to bytes */
    metadata: Record<string, unknown>;
    /** Amount to mint. For NFTs, always 1. Default: 1 */
    amount?: number;
}
interface HTSMintResult {
    /** Hedera transaction ID */
    transactionId: string;
    /** Serial numbers of newly minted NFTs (empty for fungible tokens) */
    serials: number[];
    /** The token ID that was minted */
    tokenId: string;
    /** Total new supply after minting */
    newTotalSupply: number;
}
interface HederaLoggerConfig {
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
/** Standard schema for MLAT position logs (matches AircraftWorth HCS format) */
interface MLATPositionPayload extends Record<string, unknown> {
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
    timestamp: string;
}
/** Standard schema for sensor event logs */
interface SensorEventPayload extends Record<string, unknown> {
    type: 'sensor_event';
    sensor_id: string;
    event: 'online' | 'offline' | 'degraded';
    trust_score?: number;
    timestamp: string;
}
/** Generic event schema — use for custom applications */
interface GenericEventPayload extends Record<string, unknown> {
    type: string;
    [key: string]: unknown;
}
type KnownPayload = MLATPositionPayload | SensorEventPayload | GenericEventPayload;

/**
 * @aircraftworth/hedera-logger
 * HederaLogger — main class
 *
 * Wraps Hedera SDK for clean HCS logging and HTS minting.
 * Handles retries, batching, and async concurrency.
 */

declare class HederaLogger {
    private client;
    private config;
    private queue;
    private activeCount;
    constructor(config: HederaLoggerConfig);
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
    log(options: HCSLogOptions): Promise<HCSLogResult>;
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
    logBatch(options: {
        topicId: string;
        payloads: Record<string, unknown>[];
        memo?: string;
    }): Promise<HCSBatchResult>;
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
    mint(options: HTSMintOptions): Promise<HTSMintResult>;
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
    logMLATPosition(options: {
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
    }): Promise<{
        log: HCSLogResult;
        token: HTSMintResult | null;
    }>;
    /**
     * Create a new HCS topic (for setup/initialization).
     * Returns new topic ID as a string.
     */
    createTopic(memo?: string): Promise<string>;
    /** Clean up Hedera client connection */
    close(): Promise<void>;
}

/**
 * @aircraftworth/hedera-logger
 *
 * Lightweight Hedera HCS logging and HTS token minting.
 * Works with any Node.js application — not just MLAT.
 *
 * @example
 * import { HederaLogger } from '@aircraftworth/hedera-logger'
 *
 * const logger = new HederaLogger({
 *   operatorId: process.env.HEDERA_OPERATOR_ID!,
 *   operatorKey: process.env.HEDERA_OPERATOR_KEY!,
 *   network: 'testnet'
 * })
 *
 * const result = await logger.log({
 *   topicId: '0.0.7968510',
 *   payload: { type: 'my_event', value: 42 }
 * })
 *
 * console.log(`Logged to HCS — Seq #${result.sequenceNumber}`)
 */

declare const VERSION = "0.1.0";

export { type GenericEventPayload, type HCSBatchResult, type HCSLogOptions, type HCSLogResult, type HTSMintOptions, type HTSMintResult, HederaLogger, type HederaLoggerConfig, type KnownPayload, type MLATPositionPayload, type SensorEventPayload, VERSION };
