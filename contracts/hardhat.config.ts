import { HardhatUserConfig } from "hardhat/types";

// Hedera network configuration
const HEDERA_TESTNET = {
  url: "https://testnet.hedera.com:50211",
  chainId: 296,
  accounts: {
    mnemonic: process.env.HEDERA_MNEMONIC || "",
    accountsBalance: "100000000000000000000000" // 100 HBAR per account
  }
};

const HEDERA_MAINNET = {
  url: "https://mainnet.hedera.com:50211",
  chainId: 295,
  accounts: {
    mnemonic: process.env.HEDERA_MNEMONIC || "",
    accountsBalance: "100000000000000000000000" // 100 HBAR per account
  }
};

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    hardhat: {},
    hederaTestnet: HEDERA_TESTNET,
    hederaMainnet: HEDERA_MAINNET
  }
};

export default config;
