# Meteora Dynamic Bonding Curve Integration

QUANTEK isolates Meteora DBC behavior behind `src/lib/quantek/dbc.ts`.

## SDK

The integration uses:

```text
@meteora-ag/dynamic-bonding-curve-sdk
```

The client is created from the active Solana `Connection` and commitment level.

## Program

```text
dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN
```

Pool lookups validate that the target account is owned by this program before treating it as a DBC pool.

## Service boundaries

`createDBCServices()` exposes five protocol-facing groups:

| Service | Responsibility |
| --- | --- |
| `partner` | create reusable DBC configs and claim partner trading fees |
| `creator` | create virtual pools and claim creator trading fees |
| `pool` | fetch validated pools and construct swap flows |
| `migration` | DAMM v2 migration construction |
| `state` | read configs, pools, progress, thresholds, and fee metrics |

Write-oriented SDK calls are expected to produce transactions for review. Wallet authority remains outside this module.

## Migration policy

New QUANTEK config flows default to:

```ts
MigrationOption.MET_DAMM_V2
```

DAMM v1 should not be introduced for new launch flows without an explicit protocol-compatibility reason and review.

## Transaction lifecycle

A production DBC write should follow this sequence:

1. validate user input;
2. construct the SDK transaction;
3. ensure the transaction is unsigned;
4. assign fee payer and a fresh recent blockhash;
5. derive accounts, required signers, and fee estimate;
6. display the transaction review;
7. simulate the exact reviewed message;
8. request wallet signing;
9. verify the signed message is unchanged;
10. submit only through an explicit execution path.

The current wallet helper deliberately stops at signed bytes; submission must remain an explicit, auditable step.

## Failure handling

Flows should fail closed on:

- account not found;
- account owned by the wrong program;
- RPC/network mismatch;
- rate limiting or unavailable RPC;
- expired blockhash;
- failed simulation;
- wallet rejection;
- transaction mutation.

## Launch configuration

The launch UI captures token, curve, fee, migration, quote-token, and review inputs. Some curve derivation is intentionally marked as pending until backed by complete SDK-derived configuration data. The UI must not label a draft as deployed.
