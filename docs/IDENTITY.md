# QUANTEK Identity

QUANTEK Identity is a browser-derived hash-based identity used for provenance, challenge proofs, and Quantum Launch attestations.

It is deliberately separate from the connected Solana wallet.

## Public identity

A QUANTEK identity exposes:

- a `qtk1...` address;
- a WOTS/Merkle root;
- a public seed;
- tree height 8;
- 256 one-time leaf positions.

The root plus public seed form the public verification material.

## Derivation

The intended v1 derivation flow is:

1. connect a Solana wallet;
2. construct a fixed QUANTEK-specific derivation message;
3. ask the wallet to sign that message locally;
4. optionally combine a passphrase hardened with scrypt;
5. derive identity seeds with HKDF-SHA256;
6. generate the 256 WOTS leaves and Merkle root in-browser;
7. discard ephemeral secret material when the identity session ends.

A derivation signature is not a transaction.

### Domain separation

QUANTEK uses its own namespace. Proposed identity domain:

```text
quantek.network/identity/v1
```

No external protocol's domain string should appear in QUANTEK identity derivation.

## Passphrase hardening

A wallet-only identity is recoverable by anyone who can reproduce the wallet's deterministic derivation signature.

Optional passphrase hardening adds entropy outside the wallet-key assumption.

Target scrypt parameters:

```text
N = 2^15
r = 8
p = 1
```

The passphrase must never be logged, transmitted, or persisted in plaintext.

## Registration model

A complete identity product has four stages:

### Derive

Generate the local identity and public root.

### Register

Create a public binding between:

- Solana wallet;
- qtk address;
- root;
- public seed;
- protocol version.

Leaf 0 is reserved/consumed for the genesis binding in the model.

Without a backend ledger, QUANTEK must label this a **Local Registration Profile** rather than implying a globally registered identity.

### Anchor

Prepare an SPL Memo transaction that timestamps the identity root on Solana.

Suggested memo namespace:

```text
quantek:v1:identity:<qtk-address>:<root>
```

An anchor is not considered present until its transaction is actually confirmed.

### Prove

Use the next unused identity leaf to sign a challenge digest and verify it against the root.

A one-time leaf ledger must reject reuse.

## Leaf ledger

Leaf reuse is forbidden.

The client may persist only public metadata and consumed leaf indexes. Raw WOTS secret seeds and passphrases must not be written to ordinary browser storage.

A production multi-device identity requires a stronger, coordinated leaf-allocation design than local storage alone.

## Security boundary

Identity and provenance do not change Solana's normal account authority.

To hold funds under hash-based authority, use a dedicated on-chain verifier design such as the QUANTEK Quantum Wallet architecture described in [QUANTUM_WALLETS.md](QUANTUM_WALLETS.md).
