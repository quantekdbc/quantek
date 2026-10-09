# Post-Quantum Identity and Provenance

QUANTEK's post-quantum work is scoped to **identity, provenance, and attestations**.

It is not a claim that ordinary Solana wallet balances become post-quantum secure.

## Parameter model

The current reference parameters are:

| Parameter | Value |
| --- | --- |
| Hash | SHA-256 |
| WOTS Winternitz parameter | 16 |
| WOTS chains | 67 |
| Merkle tree height | 8 |
| Leaf budget | 256 |

A height-8 tree provides 256 one-time leaf positions.

## One-time signature rule

A WOTS leaf must be treated as one-time signing material. Reusing a leaf can undermine the security assumptions of the signature scheme.

Production identity state therefore needs a reliable leaf-allocation mechanism, durable anti-reuse state, and recovery/rotation semantics before it should authorize real attestations.

## Verification model

At a high level:

1. hash the attested message;
2. derive WOTS message/checksum digits;
3. complete each signature hash chain to its public endpoint;
4. derive the leaf/public-key commitment;
5. walk the Merkle authentication path;
6. compare the computed root with the expected identity root.

## Current implementation status

`src/lib/quantek/pq.ts` contains a browser-side **public demo/reference proof** implementation. The proof kind is explicitly named `quantek-demo-wots-v1`, and its deterministic public demonstration secrets are not suitable for production signing.

This is intentional: the repository can exercise verification UX and tamper tests without pretending that demo material is secure key material.

## Production requirements

Before production attestations, QUANTEK should add:

- audited key generation/derivation;
- domain separation for every signed object type;
- durable, race-safe leaf allocation;
- encrypted local storage or an appropriate hardware/isolated key boundary;
- explicit identity rotation and exhaustion behavior;
- interoperable attestation serialization;
- independent test vectors;
- third-party cryptographic review.

## Solana boundary

Solana transaction authorization remains based on the wallet's existing signing mechanism. PQ provenance can prove that a QUANTEK identity attested to an object; it does not replace the wallet signature required by the Solana runtime.

See [THREAT_MODEL.md](THREAT_MODEL.md).
