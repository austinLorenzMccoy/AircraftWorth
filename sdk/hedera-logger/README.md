# @aircraftworth/hedera-logger

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg) ![npm version](https://img.shields.io/npm/v/@aircraftworth/hedera-logger?style=flat&logo=npm) ![TypeScript](https://img.shields.io/badge/TypeScript-blue.svg) **Published v0.2.0 with Smart Contracts!** 🎉

**Hedera HCS logging + HTS token minting + Smart contract integration for AircraftWorth marketplace.**
npm install @aircraftworth/hedera-logger
```

## Quick Start

```typescript
import { HederaLogger } from '@aircraftworth/hedera-logger'

const logger = new HederaLogger({
  operatorId: process.env.HEDERA_OPERATOR_ID!,
  operatorKey: process.env.HEDERA_OPERATOR_KEY!,
  network: 'testnet'
})

const result = await logger.log({
  topicId: '0.0.7968510',
  payload: { type: 'my_event', value: 42 }
})

console.log(`Logged to HCS — Seq #${result.sequenceNumber}`)
```

## Features

- ✅ **HCS Logging**: Structured event logging with automatic retries
- ✅ **Batch Processing**: Parallel message submission with concurrency control
- ✅ **HTS Minting**: Token/NFT creation with metadata
- ✅ **MLAT Helper**: Built-in MLAT position logging + token minting
- ✅ **Type Safety**: Full TypeScript definitions, no `any` types
- ✅ **Network Support**: Testnet, previewnet, mainnet
- ✅ **Production Ready**: Optimized builds for CommonJS + ESM

## API

### `HederaLogger`

Main class for Hedera interactions.

#### Constructor

```typescript
new HederaLogger(config: HederaLoggerConfig)
```

#### Methods

- `log(options: HCSLogOptions): Promise<HCSLogResult>`
- `logBatch(options: BatchOptions): Promise<HCSBatchResult>`
- `mint(options: HTSMintOptions): Promise<HTSMintResult>`
- `logMLATPosition(options: MLATOptions): Promise<{log: HCSLogResult, token: HTSMintResult | null}>`
- `createTopic(memo?: string): Promise<string>`
- `close(): Promise<void>`

## License

MIT
