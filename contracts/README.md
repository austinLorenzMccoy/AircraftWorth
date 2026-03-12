# @aircraftworth/contracts

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg) ![Solidity](https://img.shields.io/badge/Solidity-blue.svg)

**Smart contracts for AircraftWorth marketplace and reputation system.** 🔄 **Development Phase**

## 📋 Contracts Overview

### 1. **AircraftMarketplace.sol**
Core marketplace contract for data offerings and purchases.

**Features:**
- ✅ Data offering creation and management
- ✅ Purchase processing with escrow
- ✅ Operator verification system
- ✅ Platform fee collection (2.5%)
- ✅ Earnings tracking and withdrawals
- ✅ Event emission for frontend integration

**Key Functions:**
- `registerOperator(string name)` - Register new sensor operator
- `verifyOperator(address operator)` - Verify operator (owner only)
- `createOffering(uint256 price, string dataType, uint256 duration, ...)` - Create data offering
- `purchaseOffering(uint256 offeringId)` - Purchase with HBAR payment
- `completePurchase(uint256 purchaseId)` - Mark purchase as completed
- `withdrawEarnings()` - Withdraw operator earnings

### 2. **EscrowService.sol**
Secure escrow contract for payment protection.

**Features:**
- ✅ Secure payment holding
- ✅ Time-based release conditions
- ✅ Refund mechanism
- ✅ Platform fee separation
- ✅ Multi-party authorization

**Key Functions:**
- `createEscrow(uint256 offeringId, address buyer, address seller, ...)` - Create escrow
- `releaseEscrow(uint256 escrowId)` - Release funds to seller
- `refundEscrow(uint256 escrowId, string reason)` - Refund to buyer

### 3. **ReputationSystem.sol**
On-chain reputation tracking for operators.

**Features:**
- ✅ Review submission system (1-5 stars)
- ✅ Reputation score calculation (0-1000)
- ✅ Transaction history tracking
- ✅ Tier-based reputation levels
- ✅ Batch reputation updates

**Key Functions:**
- `submitReview(address operator, uint256 rating, string comment)` - Submit operator review
- `updateReputation(address operator, uint256 newScore, string reason)` - Manual update
- `updateTransactionReputation(address operator, bool success, string reason)` - Transaction-based update
- `getReputationTier(address operator)` - Get reputation tier (Platinum/Gold/Silver/Bronze)

## 🚀 Installation

```bash
cd contracts
npm install
```

## 🔧 Development

### Prerequisites
- Node.js 18+
- Hardhat
- Hedera account with testnet HBAR

### Setup
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Hedera credentials

# Compile contracts
npm run compile

# Run tests
npm run test

# Deploy to testnet
npm run deploy:testnet
```

## 📄 Environment Variables

```bash
# Hedera Testnet
HEDERA_MNEMONIC="your twelve word mnemonic phrase..."
HEDERA_API_KEY="your hashscan API key..."

# Contract addresses (auto-generated after deployment)
MARKETPLACE_ADDRESS="0.0.xxxxx"
ESCROW_ADDRESS="0.0.xxxxx"
REPUTATION_ADDRESS="0.0.xxxxx"
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run specific test file
npx hardhat test test/Marketplace.test.ts

# Run tests with gas reporting
REPORT_GAS=true npm run test
```

## 🚀 Deployment

### Testnet Deployment
```bash
npm run deploy:testnet
```

### Mainnet Deployment
```bash
npm run deploy:mainnet
```

### Contract Verification
```bash
npm run verify --network hederaTestnet <contract-address>
```

## 📊 Gas Optimization

- **Optimized compiler settings**: 200 runs, enabled optimizer
- **Library usage**: OpenZeppelin for security and efficiency
- **Storage optimization**: Packed structs where possible
- **Event emission**: Efficient event logging

## 🔒 Security Features

- **Reentrancy Protection**: OpenZeppelin ReentrancyGuard
- **Access Control**: Role-based permissions with onlyOwner
- **Input Validation**: Comprehensive parameter checks
- **Safe Math**: OpenZeppelin SafeMath for overflow protection
- **Escrow Security**: Time-locked funds with refund mechanism

## 📡 Events

All contracts emit comprehensive events for frontend integration:

### Marketplace Events
- `OfferingCreated` - New data offering created
- `PurchaseInitiated` - Purchase started
- `PurchaseCompleted` - Purchase fulfilled
- `EarningsWithdrawn` - Operator withdrew earnings

### Escrow Events
- `EscrowCreated` - New escrow created
- `EscrowReleased` - Funds released to seller
- `EscrowRefunded` - Funds refunded to buyer

### Reputation Events
- `ReviewSubmitted` - New review submitted
- `ReputationUpdated` - Reputation score changed
- `ReputationEventCreated` - Reputation event logged

## 📋 Integration

### Frontend Integration
```typescript
import { ethers } from 'ethers';
import AircraftMarketplaceABI from './artifacts/AircraftMarketplace.json';

const marketplace = new ethers.Contract(
  MARKETPLACE_ADDRESS,
  AircraftMarketplaceABI,
  signer
);

// Create offering
await marketplace.createOffering(
  ethers.utils.parseUnits("1.0", 8), // 1 HBAR
  "mlat_positions",
  86400, // 24 hours
  "High-quality MLAT positions",
  90, // 90% confidence
  4   // minimum 4 sensors
);
```

### HederaLogger Integration
```typescript
import { HederaLogger } from '@aircraftworth/hedera-logger';

const logger = new HederaLogger({
  operatorId: "0.0.123",
  operatorKey: "...",
  contracts: {
    marketplace: MARKETPLACE_ADDRESS,
    escrow: ESCROW_ADDRESS,
    reputation: REPUTATION_ADDRESS
  }
});

// Log contract interactions
await logger.logContractEvent({
  topicId: "0.0.7968510",
  contractType: "marketplace",
  eventName: "OfferingCreated",
  data: { offeringId, seller, price, dataType }
});
```

## 🔄 Development Status

**Current Phase**: Development
- ✅ Core contracts implemented
- ✅ Security features integrated
- ✅ Event emission complete
- 🔄 Hardhat setup in progress
- 🔄 Test suite development
- 🔄 Deployment scripts ready

**Next Steps**:
1. Complete Hardhat configuration
2. Implement comprehensive test suite
3. Deploy to Hedera testnet
4. Integrate with HederaLogger SDK
5. Frontend Web3 integration

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.
