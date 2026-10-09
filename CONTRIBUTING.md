# Contributing to QUANTEK

Thanks for improving QUANTEK.

## Development setup

Requirements:

- Node.js 22+
- npm 10+
- a browser wallet for manual wallet-standard testing
- optional Solana RPC access for integration testing

```bash
git clone https://github.com/quantekdbc/quantek.git
cd quantek
npm install
npm run dev
```

## Before opening a pull request

Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Contribution rules

1. Keep transaction signing non-custodial and client-side.
2. Never request, log, store, or transmit seed phrases or private keys.
3. Never fabricate successful on-chain writes.
4. Preserve simulation/dry-run behavior when wallet or RPC prerequisites are absent.
5. Prefer DAMM v2 for new Meteora DBC migration flows.
6. Treat WOTS leaves as one-time signing material; leaf reuse is a security defect.
7. Document material changes to signing, verification, or migration behavior.
8. Add or update tests for security-sensitive behavior.

## Pull requests

Keep PRs focused. Explain:

- what changed;
- why it changed;
- security implications;
- test coverage;
- whether any transaction or cryptographic boundary changed.

Use conventional, descriptive commit messages where practical.

## Architecture

Start with:

- [Architecture](docs/ARCHITECTURE.md)
- [Transaction model](docs/TRANSACTION_MODEL.md)
- [Threat model](docs/THREAT_MODEL.md)
- [Meteora DBC integration](docs/METEORA_DBC.md)
- [PQ identity](docs/PQ_IDENTITY.md)
