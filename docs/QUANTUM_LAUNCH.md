# Quantum Launch

Quantum Launch is QUANTEK's post-quantum-attested launch mode for Meteora Dynamic Bonding Curve pools on Solana.

It uses the same DBC execution and migration path as Standard Launch. The difference is the provenance layer attached to the launch.

## Design

A Quantum Launch combines:

1. a QUANTEK Identity;
2. a domain-separated launch digest;
3. an attestation scheme;
4. token metadata carrying the public proof material;
5. the normal QUANTEK transaction-review boundary;
6. Meteora DBC pool creation and DAMM v2 migration.

The attestation proves provenance. It does not replace Solana transaction authorization.

## QUANTEK namespace

QUANTEK does not reuse another protocol's identity or message namespace.

Suggested v1 domains:

```text
quantek.network/identity/v1
quantek.network/launch/v1
quantek.network/proof/v1
quantek.network/quantum-wallet/v1
```

QUANTEK hash-based addresses use the `qtk1...` family.

## Root scheme

The identity root of trust is WOTS-16 over SHA-256 with an XMSS-style Merkle tree:

| Parameter | Value |
| --- | --- |
| WOTS parameter | 16 |
| chains | 67 |
| Merkle height | 8 |
| leaves | 256 |
| signature size | 2,404 bytes |
| public identity material | root + public seed |

Every WOTS identity leaf is one-time. Reuse is a security failure.

## Signature options

The launch UX can expose several attestation choices while being explicit about implementation state.

| Scheme | Status | Leaf use |
| --- | --- | --- |
| QUANTEK Root — WOTS-16 + Merkle | root of trust / reference implementation | one leaf per signature |
| ML-DSA-65 | FIPS 204 | certify key once with WOTS, then many-time |
| SLH-DSA-SHA2-128s | FIPS 205 | certify key once with WOTS, then many-time |
| FN-DSA / Falcon-512 | experimental until final standardization/integration | certify once |
| ed25519 + ML-DSA-65 | advanced experimental hybrid | certify once |

The interface must not claim that a scheme is operational until key generation, certification, serialization, and verification are actually wired and tested.

## Launch digest

A QUANTEK launch digest should commit to the public launch identity, including at minimum:

- creator wallet;
- token mint;
- name;
- symbol;
- image/metadata identifier;
- launch mode;
- selected attestation scheme;
- quote mint;
- DBC config or config commitment;
- identity leaf/certificate reference.

The concrete serialization must be versioned and deterministic before production use.

## DBC lifecycle

Quantum Launch remains a Meteora DBC launch:

1. validate token and quote-market configuration;
2. derive/build the DBC curve;
3. construct a reusable PoolConfig when required;
4. use DAMM v2 migration;
5. construct the pool transaction;
6. attach/commit the QUANTEK attestation metadata;
7. show immutable transaction review;
8. simulate;
9. request wallet signing;
10. submit only through an explicit execution path.

No pump-specific program or SDK is part of this design.

## Metadata

Production metadata should be self-contained enough for independent verification. A versioned `quantek` object can include:

- protocol version;
- qtk address;
- identity root;
- public seed;
- scheme id;
- message digest;
- WOTS leaf or scheme certificate;
- signature/authentication material.

The exact production schema should be frozen with test vectors before mainnet use.
