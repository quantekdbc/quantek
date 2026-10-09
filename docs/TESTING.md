# Testing

QUANTEK uses Vitest for automated tests.

## Commands

```bash
npm run typecheck
npm run test
npm run lint
npm run build
```

CI runs the same quality gates for pull requests and pushes to `main`.

## Security-sensitive coverage

The boundary tests exercise behavior including:

- exact reviewed-message simulation;
- no submission from the signing helper;
- rejection of post-review transaction mutation;
- RPC genesis-hash mismatch;
- stale blockhash rejection;
- failed simulation rejection;
- mutation while simulation is pending;
- missing signatures;
- wallet-modified message bytes;
- DAMM v2 as the default DBC migration option;
- required DBC service boundaries;
- strategy repository isolation;
- unsafe RPC URL rejection;
- malformed PQ proof dimension rejection;
- WOTS demo-proof tamper rejection;
- route coverage.

## Test philosophy

A passing test should verify a meaningful invariant, not merely implementation detail.

For transaction and cryptographic code, prefer:

- negative tests;
- mutation tests;
- boundary values;
- invalid account/network state;
- deterministic fixtures;
- exact byte comparisons.

## Future testing

Recommended additions:

- property-based tests for WOTS proof parsing;
- fuzzing of attestation serialization;
- local-validator DBC integration tests;
- transaction account-meta snapshots;
- explicit migration-threshold edge cases;
- wallet-standard compatibility fixtures;
- browser end-to-end tests for review/sign flows.
