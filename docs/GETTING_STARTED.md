# Getting Started

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- a modern browser
- optional Phantom, Solflare, or another wallet-standard-compatible Solana wallet
- optional Solana RPC endpoint for live reads/simulation work

## Install

```bash
git clone https://github.com/quantekdbc/quantek.git
cd quantek
npm install
```

## Run locally

```bash
npm run dev
```

Open the local URL reported by Vite.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Demo mode

The current console contains clearly labeled demo pool and activity data. Demo mode is intentionally conservative:

- no private keys are requested;
- connecting a wallet does not authorize transactions;
- demo execution plans do not imply a transaction was submitted;
- live writes must be built from valid SDK transactions, reviewed, simulated, and explicitly signed.

## Networks

The settings layer supports Mainnet and Devnet. When a wallet or transaction flow is used, QUANTEK should verify that:

1. the selected network matches the RPC genesis hash;
2. the wallet account supports the selected Solana chain;
3. the transaction has a fresh blockhash;
4. the reviewed message still matches the transaction being signed.

## Next steps

- [Architecture](ARCHITECTURE.md)
- [Meteora DBC integration](METEORA_DBC.md)
- [Liquidity agent](LIQUIDITY_AGENT.md)
- [Transaction model](TRANSACTION_MODEL.md)
- [PQ identity](PQ_IDENTITY.md)
- [Threat model](THREAT_MODEL.md)
