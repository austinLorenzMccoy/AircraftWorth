// Jest setup file for @aircraftworth/hedera-logger
import '@hashgraph/sdk';

// Mock Hedera SDK for all tests
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
    setTopicId() { return this; }
    setMessage() { return this; }
    setTransactionMemo() { return this; }
    setTokenId() { return this; }
    setAmount() { return this; }
    addMetadata() { return this; }
    setTopicMemo() { return this; }
    execute = mockExecute;
  }

  return {
    Client: {
      forTestnet: () => ({ setOperator: jest.fn(), close: jest.fn() }),
      forMainnet: () => ({ setOperator: jest.fn(), close: jest.fn() }),
      forPreviewnet: () => ({ setOperator: jest.fn(), close: jest.fn() }),
    },
    TopicMessageSubmitTransaction: MockTransaction,
    TokenMintTransaction: MockTransaction,
    TopicCreateTransaction: MockTransaction,
    PrivateKey: { fromString: (k: string) => k },
    AccountId: { fromString: (id: string) => id },
    TopicId: { fromString: (id: string) => id },
    TokenId: { fromString: (id: string) => id },
    Status: { 
      Success: { toString: () => 'SUCCESS', _code: 22 },
      toString: (status: any) => status.toString ? status.toString() : 'UNKNOWN'
    },
  };
});
