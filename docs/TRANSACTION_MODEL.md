# Transaction Model

QUANTEK's transaction model is designed around one invariant:

> The transaction a user reviews must be the transaction the wallet signs.

## Construction

Protocol services may construct unsigned Solana transactions. Before review, QUANTEK should:

- confirm the transaction is unsigned;
- assign the connected wallet as fee payer;
- fetch a fresh recent blockhash;
- retain the last valid block height;
- derive account keys and required signers;
- estimate the network fee;
- serialize the message bytes that will be reviewed.

Those serialized message bytes become the review boundary.

## Review

The user should be able to inspect:

- operation type;
- target pool/config;
- program accounts;
- token accounts/vaults;
- required signers;
- fee estimate;
- network;
- simulation status;
- any migration or fee-claim implications.

## Simulation

Before signing, QUANTEK:

1. verifies the transaction still serializes to the reviewed message;
2. verifies RPC genesis hash matches the selected network;
3. verifies the blockhash remains valid;
4. simulates the reviewed transaction with signature verification disabled;
5. rejects simulation errors;
6. rechecks the blockhash and reviewed bytes after simulation.

## Signing

The wallet-standard `solana:signTransaction` feature receives the serialized transaction only after the checks above.

After the wallet returns signed bytes, QUANTEK:

- parses the returned transaction;
- compares its message bytes with the reviewed message;
- verifies the connected fee-payer signature is present and valid.

If the wallet changes the message, the signed result is rejected.

## Submission

The current signing helper returns signed bytes and does not itself submit them. This separation is deliberate.

Any future submission layer should:

- require explicit execution intent;
- submit only verified signed bytes;
- expose the resulting signature;
- distinguish submission from confirmation;
- never fabricate confirmation;
- handle blockhash expiry and retry policy explicitly.

## Failure model

The signing boundary rejects:

- post-review mutation;
- wrong fee payer;
- unsupported wallet/network;
- RPC network mismatch;
- stale or invalid blockhash;
- failed simulation;
- mutation during simulation;
- wallet-modified message bytes;
- missing/invalid wallet signatures.

Relevant tests live in `src/test/quantek-boundaries.test.ts`.
