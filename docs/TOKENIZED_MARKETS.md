# Tokenized Markets as DBC Quote Assets

QUANTEK allows a DBC launch to select a tokenized equity or ETF token as the quote asset when the selected Solana mint is compatible with the Meteora DBC configuration.

## Why this works

Meteora DBC PoolConfig accepts a quote mint. Current SDK releases support arbitrary quote-mint decimals.

Some quote mints that are not permissionless-supported require a DBC token badge passed through remaining accounts. QUANTEK must resolve this before constructing a live config.

## Registry policy

The application includes a snapshot registry of known Solana xStocks mints for discovery and launch planning.

A registry row is **not** enough to enable a live launch.

Before a live transaction is enabled, QUANTEK should verify on the active RPC:

- the mint exists;
- token program owner;
- decimals;
- Token-2022 extensions where relevant;
- current issuer metadata where available;
- whether a DBC token badge is required;
- whether the intended pool/migration configuration accepts the quote mint.

The UI should label an unchecked row as **Unverified in this session**.

## Other issuers

Solana also hosts a large catalog of tokenized public-market assets from other issuers, including Ondo Global Markets.

QUANTEK should accept a current Solana mint through the custom tokenized-market entry and validate it on-chain rather than hardcoding addresses that have not been independently verified.

## Jurisdiction and issuer terms

Tokenized market products may have issuer, transfer, redemption, or jurisdiction restrictions.

QUANTEK's quote-market selector is technical pool configuration, not a representation that a user is legally eligible to acquire, redeem, market, or distribute a given instrument.

The UI should surface this distinction before a tokenized-market quote asset is selected.

## Launch review

For any tokenized-market quote, the final review should display:

- issuer/family label;
- symbol and mint;
- on-chain token program;
- decimals;
- verification timestamp/session state;
- DBC token-badge requirement;
- quote reserve/migration threshold in quote units;
- DAMM v2 migration target.
