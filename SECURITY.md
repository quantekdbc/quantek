# Security Policy

QUANTEK handles transaction construction, wallet-signing boundaries, RPC data, and cryptographic provenance. Security reports are treated as high priority.

## Reporting a vulnerability

Please **do not open a public issue for an unpatched vulnerability**.

Use the repository's **Security** tab and submit a private vulnerability report through GitHub Security Advisories. Include:

- affected commit or version;
- reproduction steps;
- expected and observed behavior;
- security impact;
- any proof-of-concept code that is safe to share privately.

If private reporting is unavailable, open a minimal issue asking maintainers to enable a private reporting channel **without including exploit details**.

## Scope

High-priority areas include:

- transaction mutation between review and signature;
- wallet or RPC network mismatch;
- signing requests that differ from reviewed bytes;
- unsafe or deceptive simulation behavior;
- private-key, seed, passphrase, or secret-material exposure;
- WOTS leaf reuse or malformed proof acceptance;
- Merkle authentication-path verification errors;
- Meteora DBC account-owner validation;
- migration, fee-claim, or pool-routing logic that could submit unintended transactions.

## Security boundaries

QUANTEK is non-custodial. It does not request or store wallet private keys or seed phrases.

The post-quantum layer provides **identity, provenance, and attestations**. It does not by itself replace Solana's ed25519 transaction authorization. Ordinary wallet funds remain governed by Solana's existing signing model unless a dedicated on-chain post-quantum authorization mechanism is used.

See [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) and [docs/TRANSACTION_MODEL.md](docs/TRANSACTION_MODEL.md) for the detailed model.
