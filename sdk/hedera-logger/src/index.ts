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

/**
 * @aircraftworth/hedera-logger
 * Main entry point for Hedera HCS logging + smart contracts
 */

export { HederaLogger } from './logger';

export type {
  HederaLoggerConfig,
  HCSLogOptions,
  HCSLogResult,
  HCSBatchResult,
  HTSMintOptions,
  HTSMintResult,
  KnownPayload,
  ContractAddresses,
  ContractEvent,
  OfferingData,
  PurchaseData,
  ReviewData,
  ReputationUpdate,
} from './types';

export { ContractInteractor, DEFAULT_ADDRESSES } from './contracts';

// Version constant for runtime checks
export const VERSION = '0.1.0';
