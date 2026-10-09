# QUANTEK Launch

QUANTEK Launch creates Solana launch plans around Meteora Dynamic Bonding Curve.

There are two product modes:

- **Standard Launch** — DBC launch with normal QUANTEK review/simulation controls.
- **Quantum Launch** — the same DBC launch path plus a QUANTEK identity/provenance attestation.

No pump-specific SDK or program is part of QUANTEK Launch.

## Wizard

### 1. Asset

Configure metadata, token standard, decimals, and supply.

### 2. Curve

Choose a market-cap, two-segment, liquidity-weight, or custom curve model.

### 3. Fees

Configure virtual-pool fees, creator share, dynamic behavior, and migrated-pool fee policy.

### 4. Migration

New pools target DAMM v2.

### 5. Quote Market

Choose:

- SOL;
- USDC;
- custom Solana mint;
- a tokenized-market preset.

### 6. First Buy

Optionally prepare a creator/partner first-buy flow when supported by the selected DBC SDK helper and quote configuration.

### 7. Review

Display the immutable execution plan, program id, quote mint, token-badge requirement, accounts, signers, fee estimate, simulation state, and wallet checkpoints.

## Quote-market validation

Meteora DBC supports a configurable quote mint. Modern SDK releases support arbitrary quote decimals.

For quote mints outside the permissionless-supported set, DBC may require a token badge remaining account.

QUANTEK must determine this before live construction and display it in review.

See [TOKENIZED_MARKETS.md](TOKENIZED_MARKETS.md).

## Quantum Launch

Quantum Launch adds:

- qtk identity;
- identity root and public seed;
- next leaf / leaf budget;
- attestation scheme;
- launch digest;
- metadata attestation preview;
- verification trace.

The provenance proof must be independently verifiable from public metadata once the production format is finalized.

See [QUANTUM_LAUNCH.md](QUANTUM_LAUNCH.md).
