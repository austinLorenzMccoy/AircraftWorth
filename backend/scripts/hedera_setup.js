#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const {
  Client,
  AccountBalanceQuery,
  TopicCreateTransaction,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  Hbar,
} = require('@hashgraph/sdk');

async function initClient() {
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;
  if (!operatorId || !operatorKey) {
    throw new Error('Missing HEDERA_OPERATOR_ID / HEDERA_OPERATOR_KEY in backend/.env');
  }
  const ctor = Client.forTestnet || Client.forTestNet;
  if (!ctor) throw new Error('Hashgraph SDK missing forTestnet ctor');
  return ctor().setOperator(operatorId, operatorKey);
}

async function showBalance(client) {
  const balance = await new AccountBalanceQuery()
    .setAccountId(process.env.HEDERA_OPERATOR_ID)
    .execute(client);
  console.log('Balance:', balance.hbars.toString());
}

async function createTopic(client) {
  const tx = await new TopicCreateTransaction().execute(client);
  const receipt = await tx.getReceipt(client);
  console.log('Created Topic ID:', receipt.topicId.toString());
  return receipt.topicId.toString();
}

async function createToken(client) {
  const tx = await new TokenCreateTransaction()
    .setTokenName('Skill Worth Token')
    .setTokenSymbol('SWT')
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(2)
    .setInitialSupply(10000)
    .setTreasuryAccountId(process.env.HEDERA_OPERATOR_ID)
    .setSupplyType(TokenSupplyType.Infinite)
    .setMaxTransactionFee(new Hbar(20))
    .execute(client);

  const receipt = await tx.getReceipt(client);
  console.log('Created Token ID:', receipt.tokenId.toString());
  return receipt.tokenId.toString();
}

(async () => {
  const client = await initClient();
  await showBalance(client);
  const topicId = await createTopic(client);
  const tokenId = await createToken(client);
  console.log('\nSummary');
  console.log('---------');
  console.log('HCS_TOPIC_ID=', topicId);
  console.log('SWT_TOKEN_ID=', tokenId);
})();
