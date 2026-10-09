# QUANTEK

QUANTEK is a non-custodial Solana liquidity operations console for Meteora Dynamic Bonding Curve (DBC) launches, pool monitoring, strategy simulation, fee workflows, and post-quantum provenance.

## Core capabilities

- Meteora DBC launch configuration and pool operations
- Guarded liquidity-agent strategy planning and dry-run simulation
- Client-side wallet-standard transaction signing
- Explicit transaction review and signing checkpoints
- DAMM v2 migration flows
- Partner and creator fee workflows
- WOTS-16 / SHA-256 provenance with a 256-leaf Merkle identity model
- Verification and audit surfaces for attestations and proofs

## Security model

QUANTEK is non-custodial. Private keys and seed phrases are never requested or stored. Transactions are built unsigned, reviewed, simulated, and only then handed to the connected wallet for signing.

Post-quantum signatures in QUANTEK are used for provenance and identity. They do not replace Solana's ed25519 transaction authorization unless funds are controlled by a dedicated on-chain post-quantum vault.

## Stack

- React 19
- TypeScript
- TanStack Start / Router / Query
- Tailwind CSS 4
- shadcn/ui + Radix UI
- Solana Web3.js
- Wallet Standard
- Meteora Dynamic Bonding Curve SDK
- Vitest

## Development

```bash
npm install
npm run dev
```

The local development server starts on port 3000.

## Quality checks

```bash
npm run test
npm run lint
npm run build
```

## Meteora DBC

Program ID:

```text
dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN
```

New launch flows default to DAMM v2 migration.

## Repository policy

No private keys, seed phrases, wallet-derived secrets, passphrases, WOTS secret material, or production credentials belong in this repository.
