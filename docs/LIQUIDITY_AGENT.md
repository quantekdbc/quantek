# Liquidity Agent

The QUANTEK liquidity agent is a deterministic strategy planner, not a custodial trading bot and not an AI chat interface.

## Modes

### Observe

Read and preview only. No execution intent.

### Guarded

Actions may be proposed, but each transaction requires explicit user review and wallet approval.

### Autonomous

The current UI can express an autonomous scheduling policy, but autonomous signing is **not enabled**. Wallet authorization remains explicit.

## Strategy parameters

The planner models:

- target DBC pool;
- inventory target band;
- rebalance threshold;
- maximum slippage;
- maximum trade size;
- minimum SOL reserve;
- cooldown;
- maximum actions per hour;
- fee-harvest threshold;
- pause conditions.

## Modules

Current strategy modules include:

- Inventory Balancer
- Fee Harvester
- Migration Watcher
- Volatility Guard
- Liquidity Sweeper

## Guardrails

Execution planning should fail closed when a configured condition is breached, including:

- RPC degradation;
- excessive price impact;
- migration threshold reached;
- wallet disconnect.

## Simulation semantics

There are two different concepts:

1. **Strategy preview** — deterministic local planning based on configured/demo state.
2. **Transaction simulation** — Solana RPC simulation of a fully constructed transaction.

The UI must not conflate them. A local execution plan is not evidence that the corresponding transaction would succeed on-chain.

## Custody boundary

QUANTEK does not hold funds and does not sign on a user's behalf. Strategy configuration can produce an execution plan; it cannot bypass the wallet boundary described in [TRANSACTION_MODEL.md](TRANSACTION_MODEL.md).
