## Summary

Describe the change and the problem it solves.

## Scope

- [ ] UI / UX
- [ ] Meteora DBC
- [ ] Wallet / transaction signing
- [ ] Liquidity agent
- [ ] PQ identity / verification
- [ ] Documentation
- [ ] Tooling / CI

## Security checklist

- [ ] No private keys, seed phrases, passphrases, or secret material are logged or persisted.
- [ ] Transaction bytes shown for review remain identical to bytes sent for wallet signing.
- [ ] On-chain success is never fabricated.
- [ ] RPC/network mismatch behavior remains safe.
- [ ] WOTS one-time-leaf rules remain enforced where applicable.
- [ ] New Meteora migration flows default to DAMM v2 unless explicitly justified.

## Validation

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`

## Notes for reviewers

Call out any change to trust boundaries, transaction construction, cryptographic verification, account ownership checks, or migration behavior.
