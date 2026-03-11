# Smart Contract Deployment Guide

This guide explains how to deploy the Stacks smart contracts in this repo, get the correct `CONTRACT_ADDRESS`, configure the app locally, and prepare the project for Vercel.

It is written for this repo specifically:

- Stacks contracts live in `stacks-contracts/`
- The main marketplace contract is `prompt-marketplace`
- The app expects `CONTRACT_ADDRESS` in `.env`
- Optional token contracts are `mock-sbtc-token` and `mock-usdcx-token`

---

## 1. What gets deployed

This repo defines these contracts in `stacks-contracts/Clarinet.toml`:

- `sip010-ft-trait`
- `mock-sbtc-token`
- `mock-usdcx-token`
- `prompt-marketplace`

The app uses the `prompt-marketplace` contract as the main on-chain marketplace contract.

After deployment, the main contract ID will be:

```txt
<deployer-address>.prompt-marketplace
```

Examples:

- Testnet: `ST...prompt-marketplace`
- Mainnet: `SP...prompt-marketplace`

If you also use the mock token contracts, they will be:

```txt
<deployer-address>.mock-sbtc-token
<deployer-address>.mock-usdcx-token
```

---

## 2. Important security note

Do **not** use your personal Leather recovery phrase as a server secret.

Recommended setup:

- Use your browser wallet for user-side signing
- Use a **dedicated deployer/server wallet** for contract deployment and backend automation
- Keep only small balances in that wallet

If you already exposed a recovery phrase anywhere public or shared, treat that wallet as compromised.

---

## 3. Prerequisites

Before deploying, make sure you have:

- Node.js installed
- Clarinet installed
- A funded Stacks **testnet** wallet
- Testnet STX for deployment fees

Useful docs:

- Clarinet docs: https://docs.hiro.so/en/tools/clarinet
- Clarinet deployment docs: https://docs.hiro.so/en/tools/clarinet/deployment
- Stacks contract deployment reference: https://docs.stacks.co/stacks.js/contract-deployment
- Hiro testnet faucet: https://explorer.hiro.so/sandbox/faucet?chain=testnet

---

## 4. Configure the deployer wallet

This repo already includes:

```txt
stacks-contracts/settings/Testnet.toml
```

The deployer account is configured under:

```toml
[accounts.deployer]
mnemonic = "<YOUR PRIVATE TESTNET MNEMONIC HERE>"
```

### Recommended approach

Use an encrypted mnemonic instead of plain text if possible.

Clarinet supports encrypted deployment mnemonics. See the official deployment docs for the encrypted mnemonic flow.

### If you use a plain mnemonic

The value must be a valid BIP39 recovery phrase:

- 12 words
- 15 words
- 18 words
- 21 words
- or 24 words

It must be wrapped in quotes, for example:

```toml
[accounts.deployer]
mnemonic = "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"
```

Do **not** put any of these there:

- a private key
- a wallet address
- a contract address
- a placeholder string

---

## 5. Validate the contracts

From the repo root:

```bash
cd stacks-contracts
clarinet check
```

If that succeeds, the contracts are valid and ready for deployment planning.

---

## 6. Generate the testnet deployment plan

Run:

```bash
clarinet deployments generate --testnet
```

Clarinet will generate a testnet deployment plan and show the contracts that will be published.

For this repo, the important publish step is:

```txt
contract-name: prompt-marketplace
expected-sender: <your testnet address>
```

That expected sender address is the address that will own and publish the contract.

---

## 7. Apply the deployment

Run:

```bash
clarinet deployments apply --testnet
```

If the deployment succeeds, Clarinet will confirm the transactions on testnet.

At that point, your contract exists on-chain.

---

## 8. Get the contract address

Once deployment is confirmed, build the contract ID using:

```txt
<expected-sender>.prompt-marketplace
```

For example, if the deployment plan shows:

```txt
expected-sender: ST16K4ZYM14WPG9GZQ5BPXNQAEVTJPRMA4VWJCXYY
```

then the correct value is:

```env
CONTRACT_ADDRESS=ST16K4ZYM14WPG9GZQ5BPXNQAEVTJPRMA4VWJCXYY.prompt-marketplace
```

Optional token contract values would be:

```env
SBTC_CONTRACT=ST16K4ZYM14WPG9GZQ5BPXNQAEVTJPRMA4VWJCXYY.mock-sbtc-token
USDCX_CONTRACT=ST16K4ZYM14WPG9GZQ5BPXNQAEVTJPRMA4VWJCXYY.mock-usdcx-token
```

You can also verify the deployed contracts in Hiro Explorer:

- Testnet explorer: https://explorer.hiro.so/?chain=testnet

Search for:

- the deployer address, or
- the full contract ID

---

## 9. Update your local `.env`

After deployment, add these values to your local `.env` or `.env.local`:

```env
STACKS_NETWORK=testnet
HIRO_API_KEY=your_hiro_api_key
CONTRACT_ADDRESS=<deployer-address>.prompt-marketplace
```

### Optional values

Only add these if needed:

```env
SBTC_CONTRACT=<deployer-address>.mock-sbtc-token
USDCX_CONTRACT=<deployer-address>.mock-usdcx-token
RPC_URL=https://api.testnet.hiro.so
X402_FACILITATOR_URL=https://facilitator.stacksx402.com
```

---

## 10. When `WALLET_PRIVATE_KEY` is needed

This app only needs `WALLET_PRIVATE_KEY` for server-side features such as:

- x402 purchase recording
- server-side automation
- `/agent`

If you only want:

- `/browse`
- on-chain listing
- browser-wallet purchases

then you can leave `WALLET_PRIVATE_KEY` unset at first.

### If you want full x402 backend support

Then add:

```env
WALLET_PRIVATE_KEY=your_server_wallet_private_key
```

Recommended:

- Use a dedicated server wallet
- Do not use your main personal wallet

---

## 11. Access recorder requirement

The contract stores an `access-recorder` principal.

By default, it starts as the deployer account.

That means:

- if your backend uses the **same** deployer wallet, you usually do not need extra setup
- if your backend uses a **different** wallet, you must call:

```clarity
(set-access-recorder <new-recorder-principal>)
```

on the `prompt-marketplace` contract after deployment.

This matters because x402 purchase recording depends on the recorder wallet being authorized.

---

## 12. Add production env vars in Vercel

In Vercel:

1. Open the project
2. Go to **Settings**
3. Go to **Environment Variables**
4. Add your variables for **Production**

Minimum production values:

```env
STACKS_NETWORK=testnet
HIRO_API_KEY=your_hiro_api_key
CONTRACT_ADDRESS=<deployer-address>.prompt-marketplace
```

Optional production values:

```env
WALLET_PRIVATE_KEY=your_server_wallet_private_key
SBTC_CONTRACT=<deployer-address>.mock-sbtc-token
USDCX_CONTRACT=<deployer-address>.mock-usdcx-token
X402_FACILITATOR_URL=https://facilitator.stacksx402.com
```

After saving env vars in Vercel, redeploy the app.

Useful docs:

- Vercel env vars: https://vercel.com/docs/environment-variables

---

## 13. Important Vercel limitation in this repo

This repo currently stores local draft and premium content data in:

```txt
data/runtime/drafts.json
```

via code in:

```txt
src/lib/server/drafts.ts
```

Vercel Functions do not provide normal persistent project filesystem storage.

That means:

- local draft storage is fine for local development
- but it is **not** a reliable production datastore on Vercel

### Practical implication

Even after deploying the smart contract successfully:

- on-chain contract reads can work
- browser wallet flows can work
- but seller draft persistence and premium content storage should be moved to a real database before treating this as full production

Good production options:

- Supabase
- Vercel Postgres
- Vercel KV
- another external database

Useful docs:

- Vercel runtimes and filesystem behavior: https://vercel.com/docs/functions/runtimes

---

## 14. Full quick-start checklist

Use this order:

1. Install Clarinet
2. Create or choose a dedicated testnet deployer wallet
3. Fund it with testnet STX
4. Put the deployer mnemonic into `stacks-contracts/settings/Testnet.toml`
5. Run `clarinet check`
6. Run `clarinet deployments generate --testnet`
7. Confirm the `expected-sender`
8. Run `clarinet deployments apply --testnet`
9. Build `CONTRACT_ADDRESS` as `<expected-sender>.prompt-marketplace`
10. Add it to `.env`
11. Add the same value to Vercel env vars
12. Redeploy Vercel
13. Test `/browse`

---

## 15. Example using a real deployment sender

If your deployment output shows:

```txt
expected-sender: ST16K4ZYM14WPG9GZQ5BPXNQAEVTJPRMA4VWJCXYY
```

then use:

```env
CONTRACT_ADDRESS=ST16K4ZYM14WPG9GZQ5BPXNQAEVTJPRMA4VWJCXYY.prompt-marketplace
SBTC_CONTRACT=ST16K4ZYM14WPG9GZQ5BPXNQAEVTJPRMA4VWJCXYY.mock-sbtc-token
USDCX_CONTRACT=ST16K4ZYM14WPG9GZQ5BPXNQAEVTJPRMA4VWJCXYY.mock-usdcx-token
STACKS_NETWORK=testnet
```

---

## 16. Troubleshooting

### `mnemonic has an invalid word count`

Your mnemonic value in `Testnet.toml` is not a valid 12/15/18/21/24-word recovery phrase.

### `CONTRACT_ADDRESS must be set`

You have not yet added the deployed contract ID to `.env`.

### `/browse` shows local prompts only

This means the app is running without a valid deployed `CONTRACT_ADDRESS`.

### Vercel works but seller data is missing

This repo currently uses file-based draft storage, which is not suitable for persistent serverless production storage.

---

## 17. Recommended next improvements

Before calling this fully production-ready, you should:

1. Move draft and premium content storage out of local files
2. Add a production database
3. Use a dedicated server wallet for recorder/x402 automation
4. Keep your personal wallet out of backend secrets

