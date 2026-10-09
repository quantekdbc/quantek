# Threat Model

This document defines the security assumptions for the current QUANTEK alpha.

## Assets

QUANTEK aims to protect:

- user intent before wallet signing;
- transaction integrity;
- wallet privacy and custody boundaries;
- selected-network correctness;
- strategy guardrails;
- DBC account interpretation;
- PQ identity roots and one-time leaf usage;
- integrity of audit information presented to the user.

## Adversaries and failure sources

### Malicious or compromised RPC

An RPC may lie, be stale, rate-limit requests, or point to the wrong Solana cluster.

Mitigations:

- validate RPC URL shape;
- compare genesis hash with the selected network;
- fail closed on unavailable/mismatched RPC;
- validate DBC account ownership;
- treat simulation as one signal, not a guarantee.

### Transaction mutation

UI state, asynchronous code, or a malicious wallet could alter a transaction after review.

Mitigations:

- freeze reviewed message bytes;
- compare before simulation;
- compare after simulation;
- compare the wallet-returned signed message;
- reject any mismatch.

### Malicious wallet extension

A browser wallet has powerful local privileges and may return unexpected data.

Mitigations:

- use wallet-standard feature boundaries;
- validate the selected account/network;
- reject modified message bytes;
- verify required signatures on returned bytes.

QUANTEK cannot make a compromised browser extension trustworthy.

### Incorrect DBC account

A user may paste an address that is not a Meteora DBC pool.

Mitigation:

- check the account owner against the Meteora DBC program before decoding/using it as a pool.

### PQ proof tampering

An attacker may alter a message, WOTS signature chain element, authentication path, leaf number, or root.

Mitigations:

- strict proof dimensions;
- 32-byte hex validation;
- recomputation of WOTS chain endpoints;
- Merkle authentication-path recomputation;
- exact root comparison.

### WOTS leaf reuse

A signer may accidentally reuse one-time signing material.

Impact:

- violates the one-time signature security model.

Required production mitigation:

- durable, race-safe leaf allocation with explicit exhaustion and rotation.

The current public demo proof is not production key material.

### Misleading simulation or demo data

Users may confuse a local preview with live execution.

Mitigations:

- label demo/simulated state;
- distinguish deterministic strategy preview from RPC transaction simulation;
- never label a draft as deployed;
- never fabricate an on-chain signature or success state.

## Out of scope

The current architecture does not claim to defend against:

- a compromised operating system or browser;
- a malicious wallet with access to unrelated secrets;
- consensus failure in Solana;
- vulnerabilities in third-party protocol programs;
- quantum attacks against Solana's existing ed25519 authorization;
- production PQ key storage, until a production key-management design is implemented.

## Security review priorities

Before any production execution mode:

1. independent review of transaction construction/signing;
2. complete DBC instruction/account validation;
3. production RPC and confirmation policy;
4. cryptographic review of PQ serialization/domain separation;
5. durable leaf anti-reuse state;
6. fuzz/property tests for malformed proofs and transaction mutation;
7. dependency and supply-chain review.
