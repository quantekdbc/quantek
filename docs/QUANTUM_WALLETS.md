# Quantum Wallets

Quantum Wallets are QUANTEK's design for hash-signature-controlled Solana vaults.

This is distinct from connecting a normal browser wallet.

## Why a dedicated vault is required

A normal Solana account is authorized by its existing signature model. A post-quantum provenance signature over metadata does not change who can move those funds.

A Quantum Wallet therefore requires an on-chain program that verifies a hash-based signature and controls the vault directly.

## Current status

QUANTEK does **not** yet have a deployed Quantum Wallet verifier program.

The application may model, simulate, and prepare the workflow, but live deposit/withdraw controls must remain disabled until a QUANTEK-owned program is implemented, audited, deployed, and configured.

The TypeScript adapter should expose this state explicitly rather than pointing to a third-party program.

## Proposed one-time vault chain

A vault commits to a WOTS public-key hash.

A spend commits to:

- program/version namespace;
- current vault;
- recipient;
- asset mint, or a zero/native marker for SOL;
- amount;
- next-vault public-key hash.

The spend consumes the current one-time key. Remaining assets roll into the next vault.

## State progression

```text
Quantum Wallet #0
    |
    | one-time spend
    v
consumed / tombstone
    |
    +------ remainder ------> Quantum Wallet #1
                                  |
                                  | one-time spend
                                  v
                              Quantum Wallet #2
```

The one-time property must be enforced on-chain, not merely by UI state.

## Signature staging

A WOTS signature and its public material may exceed Solana's single-transaction packet budget.

A practical verifier can therefore use a staged flow:

1. write signature payload chunks to a temporary buffer;
2. read back/verify the complete staged payload;
3. execute the spend;
4. close/refund the temporary buffer where possible.

The final instruction must reconstruct its own digest from instruction parameters and must not trust a caller-supplied digest.

## Assets

The product design should cover:

- SOL;
- SPL Token;
- Token-2022.

Token-2022 extensions may require additional accounts and protocol-specific handling.

## UX requirements

The Quantum Wallets page should show:

- current vault index;
- public-key hash;
- current vault address or preview;
- next-vault preview;
- asset inventory;
- spend state;
- signature staging progress;
- recipient, mint, amount, and rollover commitment;
- proof trace;
- consumed/tombstone status.

## Safety requirements

Before live deployment:

- independent Rust/on-chain review;
- cross-language test vectors;
- replay-resistance tests;
- one-time-spend tests;
- Token-2022 extension tests;
- compute-budget measurements;
- staged-buffer race tests;
- immutable or governed upgrade policy;
- mainnet binary reproducibility.

Until then, QUANTEK must say **Protocol adapter not deployed** and keep live custody execution disabled.
