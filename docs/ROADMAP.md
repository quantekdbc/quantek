# Roadmap

This roadmap is directional, not a promise of delivery dates.

## Phase 0 — Public alpha foundation

- [x] QUANTEK console shell and routes
- [x] Meteora DBC SDK service boundary
- [x] DAMM v2 default migration policy
- [x] wallet-standard discovery and connection
- [x] reviewed-message mutation protection
- [x] deterministic liquidity-agent planning
- [x] WOTS-16 / SHA-256 public demo verification
- [x] security boundary tests
- [x] CI and repository security documentation

## Phase 1 — Live-read protocol integration

- [ ] production pool/config discovery
- [ ] live reserve, progress, fee, and migration metrics
- [ ] canonical quote-token metadata
- [ ] stronger RPC failover/health model
- [ ] explorer and account diagnostics
- [ ] local-validator integration suite

## Phase 2 — Explicit execution

- [ ] end-to-end SDK transaction construction for supported actions
- [ ] complete transaction-review decoding
- [ ] explicit signed-byte submission layer
- [ ] confirmation/finality states
- [ ] blockhash-expiry recovery
- [ ] priority-fee policy
- [ ] fee-claim execution
- [ ] guarded rebalance execution

No background signing or hidden custody is planned.

## Phase 3 — Production provenance

- [ ] versioned attestation schema
- [ ] production PQ key derivation/storage design
- [ ] durable one-time leaf allocation
- [ ] identity rotation and exhaustion
- [ ] cross-implementation test vectors
- [ ] cryptographic audit
- [ ] optional on-chain anchoring of identity/provenance state

## Phase 4 — Operations platform

- [ ] strategy presets and signed policy versions
- [ ] richer event/audit exports
- [ ] multi-pool operational views
- [ ] historical execution analytics
- [ ] policy-based alerts
- [ ] production deployment hardening

## Non-goals

- custody of user private keys;
- hidden or server-side wallet signing;
- guaranteed yield or profit claims;
- presenting provenance signatures as a replacement for Solana transaction authorization.
