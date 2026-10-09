# QUANTEK Quantum Wallet Protocol

QUANTEK Quantum Wallets use a Solana program-owned vault whose spending authority advances through one-time WOTS-16 leaves committed by a QUANTEK identity root.

## User setup flow

1. Derive a QUANTEK `qtk1` identity.
2. Configure the deployed verifier program id in `VITE_QUANTEK_QUANTUM_WALLET_PROGRAM_ID`.
3. Verify that the program account exists and is executable on the selected Solana cluster.
4. Derive the vault PDA from the QUANTEK identity root.
5. Initialize the vault on Solana.
6. Deposit SOL or tokens into accounts controlled by the vault PDA.
7. For each spend, stage and verify the current one-time WOTS proof.
8. Execute the withdrawal and advance to the next leaf.

Incomplete setup is not an error. The application should guide the user through the missing step and enable custody actions only after the verifier and vault are both live.

## On-chain state

### Vault

The vault PDA is derived from:

```text
["qvault", identity_root]
```

It stores:

- QUANTEK identity root
- public seed
- current WOTS leaf
- spend counter
- PDA bump

Leaf `0` remains reserved for identity registration. Quantum Wallet custody begins at leaf `1`.

### Proof stage

A spend proof PDA is derived from:

```text
["qproof", vault_pubkey, current_leaf_be]
```

It commits to:

- recipient
- asset mint (zero pubkey for native SOL)
- atomic amount
- current leaf
- next leaf
- QUANTEK program id
- vault address

The stage stores the eight Merkle siblings and the reconstructed endpoints for all 67 WOTS chains.

## Verification

WOTS verification is intentionally split across transactions. Each `VerifyWotsChunk` instruction verifies at most eight chains and stores the resulting public endpoints.

After all 67 chains are complete, `FinalizeProof`:

1. hashes the 67 endpoints into the leaf commitment;
2. walks the eight-level Merkle authentication path;
3. compares the resulting root to the vault identity root;
4. marks the stage finalized.

Only a finalized stage can authorize a withdrawal.

## Withdrawals

### SOL

The program transfers lamports directly from the program-owned vault account while preserving rent exemption.

### SPL Token / Token-2022

The program verifies that:

- source and destination are owned by the supplied token program;
- the source mint matches the committed mint;
- the source token-account authority is the vault PDA;
- the destination token account uses the same mint.

It then invokes the standard `TransferChecked` instruction with the vault PDA as signer.

## Replay and one-time guarantees

A withdrawal succeeds only when:

- staged leaf equals the vault's current leaf;
- all 67 WOTS chains have been verified;
- the Merkle root matches;
- the staged digest still matches the exact spend fields;
- the spend has not already advanced the vault.

After execution, the vault advances to the next leaf and the proof-stage account is closed. A previously used leaf cannot execute again.

## Deployment

### Devnet first

Build and deploy the program with the Solana toolchain, then configure the public program id:

```bash
export VITE_QUANTEK_QUANTUM_WALLET_PROGRAM_ID=<devnet_program_id>
```

The web app verifies the configured account on the active RPC before offering vault initialization.

### Mainnet

Do not enable mainnet custody merely by changing the environment variable.

Before mainnet:

- complete program-test and devnet testing;
- test replay, malformed proof, leaf reuse, and account-substitution attacks;
- test SOL, SPL Token, and Token-2022 withdrawals;
- measure compute usage for worst-case WOTS chain digits;
- independently audit the on-chain verifier;
- control the upgrade authority with an appropriate operational policy.

The application should show **Quantum Wallet ready** only when the configured program is executable and the selected identity's vault PDA has been initialized.
