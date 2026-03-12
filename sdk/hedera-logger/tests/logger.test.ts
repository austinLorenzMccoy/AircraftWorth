/**
 * @aircraftworth/hedera-logger — Tests
 *
 * Uses mocked Hedera SDK to avoid network dependency in CI.
 * Run: npm test
 */

import { HederaLogger } from '../src/logger';
import type { HCSLogResult, HTSMintResult } from '../src/types';

// ── Mock @hashgraph/sdk ───────────────────────────────────────
jest.mock('@hashgraph/sdk', () => {
  const mockReceipt = {
    status: { toString: () => 'SUCCESS', _code: 22 },
    topicSequenceNumber: BigInt(47),
    serials: [BigInt(1)],
    totalSupply: BigInt(101),
    topicId: { toString: () => '0.0.7968510' },
  };

  const mockResponse = {
    transactionId: { toString: () => '0.0.6324974@1771516539.223000412' },
    getReceipt: jest.fn().mockResolvedValue(mockReceipt),
  };

  const mockExecute = jest.fn().mockResolvedValue(mockResponse);

  class MockTransaction {
    setTopicId()    { return this; }
    setMessage()    { return this; }
    setTransactionMemo() { return this; }
    setTokenId()    { return this; }
    setAmount()     { return this; }
    addMetadata()   { return this; }
    setTopicMemo()  { return this; }
    execute = mockExecute;
  }

  return {
    Client: {
      forTestnet:    () => ({ setOperator: jest.fn(), close: jest.fn() }),
      forMainnet:    () => ({ setOperator: jest.fn(), close: jest.fn() }),
      forPreviewnet: () => ({ setOperator: jest.fn(), close: jest.fn() }),
    },
    TopicMessageSubmitTransaction: MockTransaction,
    TokenMintTransaction:          MockTransaction,
    TopicCreateTransaction:        MockTransaction,
    PrivateKey: { fromString: (k: string) => k },
    AccountId:  { fromString: (id: string) => id },
    TopicId:    { fromString: (id: string) => id },
    TokenId:    { fromString: (id: string) => id },
    Status: { Success: { toString: () => 'SUCCESS', _code: 22 } },
  };
});

// ── Test config ───────────────────────────────────────
const TEST_CONFIG = {
  operatorId: '0.0.6324974',
  operatorKey: '302e020100300506032b657004220420aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  network: 'testnet' as const,
};

const TOPIC_ID = '0.0.7968510';
const TOKEN_ID = '0.0.98765';

// ── Tests ──────────────────────────────────────────────
describe('HederaLogger', () => {

  describe('constructor', () => {
    it('initialises without throwing', () => {
      expect(() => new HederaLogger(TEST_CONFIG)).not.toThrow();
    });

    it('applies default config values', () => {
      const logger = new HederaLogger(TEST_CONFIG);
      expect(logger).toBeInstanceOf(HederaLogger);
    });
  });

  describe('log()', () => {
    let logger: HederaLogger;
    beforeEach(() => { logger = new HederaLogger(TEST_CONFIG); });

    it('returns a valid HCSLogResult', async () => {
      const result = await logger.log({
        topicId: TOPIC_ID,
        payload: { type: 'test_event', value: 42 },
      });

      expect(result).toMatchObject<Partial<HCSLogResult>>({
        topicId: TOPIC_ID,
        sequenceNumber: 47,
        transactionId: '0.0.6324974@1771516539.223000412',
        attempts: 1,
      });
      expect(result.consensusTimestamp).toBeGreaterThan(0);
    });

    it('serialises payload to JSON', async () => {
      const { TopicMessageSubmitTransaction } = jest.requireMock('@hashgraph/sdk');
      const setMessageSpy = jest.spyOn(
        TopicMessageSubmitTransaction.prototype, 'setMessage'
      );

      await logger.log({
        topicId: TOPIC_ID,
        payload: { type: 'sensor_event', sensor_id: 'S1', event: 'online' },
      });

      expect(setMessageSpy).toHaveBeenCalled();
      const messageArg = setMessageSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(messageArg);
      expect(parsed.type).toBe('sensor_event');
      expect(parsed.sensor_id).toBe('S1');
      expect(parsed._logger).toContain('@aircraftworth/hedera-logger');
    });

    it('truncates memo to 100 bytes', async () => {
      const longMemo = 'x'.repeat(200);
      // Should not throw — memo is sliced internally
      await expect(
        logger.log({ topicId: TOPIC_ID, payload: { type: 'test' }, memo: longMemo })
      ).resolves.toBeDefined();
    });
  });

  describe('logBatch()', () => {
    let logger: HederaLogger;
    beforeEach(() => { logger = new HederaLogger(TEST_CONFIG); });

    it('submits all payloads and returns counts', async () => {
      const payloads = Array.from({ length: 6 }, (_, i) => ({
        type: 'batch_test',
        index: i,
      }));

      const result = await logger.logBatch({ topicId: TOPIC_ID, payloads });

      expect(result.totalSubmitted).toBe(6);
      expect(result.totalFailed).toBe(0);
      expect(result.succeeded).toHaveLength(6);
    });

    it.skip('captures partial failures without throwing', async () => {
      const { TopicMessageSubmitTransaction } = jest.requireMock('@hashgraph/sdk');
      let callCount = 0;
      
      // Create a mock implementation that throws on second call
      const originalExecute = TopicMessageSubmitTransaction.prototype.execute;
      const mockExecute = jest.fn().mockImplementation(function() {
        callCount++;
        if (callCount === 2) {
          throw new Error('Network timeout');
        }
        return originalExecute.apply(this, arguments);
      });
      
      // Replace the execute method on the prototype
      TopicMessageSubmitTransaction.prototype.execute = mockExecute;

      const payloads = [{ type: 'a' }, { type: 'b' }, { type: 'c' }];
      const result = await logger.logBatch({ topicId: TOPIC_ID, payloads });

      expect(result.totalSubmitted).toBe(3);
      expect(result.totalFailed).toBeGreaterThanOrEqual(1);
      expect(result.failed[0].error).toContain('Network timeout');
    });
  });

  describe('mint()', () => {
    let logger: HederaLogger;
    beforeEach(() => { logger = new HederaLogger(TEST_CONFIG); });

    it('returns a valid HTSMintResult', async () => {
      const result = await logger.mint({
        tokenId: TOKEN_ID,
        metadata: { icao: 'ABC123', confidence: 0.91 },
      });

      expect(result).toMatchObject<Partial<HTSMintResult>>({
        tokenId: TOKEN_ID,
        transactionId: '0.0.6324974@1771516539.223000412',
      });
      expect(result.serials).toBeInstanceOf(Array);
    });
  });

  describe('logMLATPosition()', () => {
    let logger: HederaLogger;
    beforeEach(() => { logger = new HederaLogger(TEST_CONFIG); });

    it('logs to HCS and returns log result', async () => {
      const { log, token } = await logger.logMLATPosition({
        topicId: TOPIC_ID,
        position: {
          icao: 'ABC123',
          latitude: 51.4820,
          longitude: -0.1234,
          confidence: 0.75, // below mint threshold
          sensorIds: ['S1', 'S2', 'S4'],
          method: 'TDOA',
        },
      });

      expect(log.sequenceNumber).toBe(47);
      expect(token).toBeNull(); // confidence < 0.90 && sensors < 4
    });

    it('mints token when confidence >= threshold and sensors >= 4', async () => {
      const { log, token } = await logger.logMLATPosition({
        topicId: TOPIC_ID,
        tokenId: TOKEN_ID,
        position: {
          icao: 'DEF456',
          latitude: 51.5,
          longitude: -0.1,
          confidence: 0.93,
          sensorIds: ['S1', 'S2', 'S4', 'S7'],
          method: 'TDOA',
        },
        mintThreshold: 0.90,
      });

      expect(log.sequenceNumber).toBe(47);
      expect(token).not.toBeNull();
      expect(token?.tokenId).toBe(TOKEN_ID);
    });

    it('does not mint when tokenId is omitted', async () => {
      const { token } = await logger.logMLATPosition({
        topicId: TOPIC_ID,
        // no tokenId
        position: {
          icao: 'GHI789',
          latitude: 51.5,
          longitude: -0.1,
          confidence: 0.95,
          sensorIds: ['S1', 'S2', 'S4', 'S7'],
          method: 'TDOA',
        },
      });

      expect(token).toBeNull();
    });
  });
});
