require("dotenv").config();
const { PrivateKey } = require("@hashgraph/sdk");

const derKey = process.env.HEDERA_MNEMONIC; // actually a DER key

const privateKey = PrivateKey.fromStringDer(derKey);

const rawKey = privateKey.toStringRaw();

console.log("Raw EVM Key:");
console.log("0x" + rawKey);