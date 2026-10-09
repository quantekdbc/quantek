import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  type Commitment,
  type ParsedAccountData,
} from "@solana/web3.js";
import {
  DynamicBondingCurveClient,
  MigrationOption,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { rpcSchema } from "./validation";

export const DBC_PROGRAM_ID = "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN";
export const DEFAULT_MIGRATION = MigrationOption.MET_DAMM_V2;
export const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const SPL_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export type QuoteMintInspection = {
  mint: string;
  exists: boolean;
  decimals: number | null;
  tokenProgram: "SPL Token" | "Token-2022" | "Unknown";
  tokenProgramId: string | null;
  tokenBadge: "not-required-known-quote" | "resolve-before-live-construction";
  verifiedAt: string;
};

/**
 * All write services build unsigned transactions only. No send API is exposed.
 * New config construction is pinned to DAMM v2.
 */
export function createDBCServices(rpc: string, commitment: Commitment = "confirmed") {
  const connection = new Connection(rpcSchema.parse(rpc), {
    commitment,
    disableRetryOnRateLimit: true,
  });
  const client = new DynamicBondingCurveClient(connection, commitment);

  async function getPool(address: string) {
    const key = new PublicKey(address);
    const account = await connection.getAccountInfo(key, commitment);
    if (!account) throw new Error("Pool account not found on the selected network.");
    if (!account.owner.equals(new PublicKey(DBC_PROGRAM_ID))) {
      throw new Error("Account is not owned by the Meteora DBC program.");
    }
    const pool = await client.state.getPool(key);
    if (!pool) throw new Error("Pool account not found on the selected network.");
    return pool;
  }

  async function inspectQuoteMint(mintAddress: string): Promise<QuoteMintInspection> {
    const mint = new PublicKey(mintAddress);
    const account = await connection.getParsedAccountInfo(mint, commitment);
    if (!account.value) {
      return {
        mint: mint.toBase58(),
        exists: false,
        decimals: null,
        tokenProgram: "Unknown",
        tokenProgramId: null,
        tokenBadge: "resolve-before-live-construction",
        verifiedAt: new Date().toISOString(),
      };
    }

    const owner = account.value.owner.toBase58();
    const parsed = account.value.data as ParsedAccountData | Buffer;
    const decimals =
      "parsed" in parsed && typeof parsed.parsed?.info?.decimals === "number"
        ? parsed.parsed.info.decimals
        : null;
    const tokenProgram =
      owner === SPL_TOKEN_PROGRAM
        ? "SPL Token"
        : owner === TOKEN_2022_PROGRAM
          ? "Token-2022"
          : "Unknown";
    const knownPermissionlessQuote =
      mint.toBase58() === WRAPPED_SOL_MINT || mint.toBase58() === USDC_MINT;

    return {
      mint: mint.toBase58(),
      exists: true,
      decimals,
      tokenProgram,
      tokenProgramId: owner,
      tokenBadge: knownPermissionlessQuote
        ? "not-required-known-quote"
        : "resolve-before-live-construction",
      verifiedAt: new Date().toISOString(),
    };
  }

  return {
    connection,
    client,
    partner: {
      createConfig: (params: Parameters<typeof client.partner.createConfig>[0]) =>
        client.partner.createConfig({ ...params, migrationOption: DEFAULT_MIGRATION }),
      createConfigAndPool: (
        params: Parameters<typeof client.partner.createConfigAndPool>[0],
      ) => client.partner.createConfigAndPool({ ...params, migrationOption: DEFAULT_MIGRATION }),
      createConfigAndPoolWithFirstBuy: (
        params: Parameters<typeof client.partner.createConfigAndPoolWithFirstBuy>[0],
      ) =>
        client.partner.createConfigAndPoolWithFirstBuy({
          ...params,
          migrationOption: DEFAULT_MIGRATION,
        }),
      claimFees: (
        params: Parameters<typeof client.partner.claimPartnerTradingFee>[0],
      ) => client.partner.claimPartnerTradingFee(params),
    },
    creator: {
      createPool: (params: Parameters<typeof client.creator.createPool>[0]) =>
        client.creator.createPool(params),
      createPoolWithFirstBuy: (
        params: Parameters<typeof client.creator.createPoolWithFirstBuy>[0],
      ) => client.creator.createPoolWithFirstBuy(params),
      createPoolWithPartnerAndCreatorFirstBuy: (
        params: Parameters<
          typeof client.creator.createPoolWithPartnerAndCreatorFirstBuy
        >[0],
      ) => client.creator.createPoolWithPartnerAndCreatorFirstBuy(params),
      claimFees: (
        params: Parameters<typeof client.creator.claimCreatorTradingFee>[0],
      ) => client.creator.claimCreatorTradingFee(params),
    },
    pool: {
      get: getPool,
      swap: (params: Parameters<typeof client.pool.swap>[0]) =>
        client.pool.swap(params),
    },
    migration: {
      toDammV2: (
        params: Parameters<typeof client.migration.migrateToDammV2>[0],
      ) => client.migration.migrateToDammV2(params),
    },
    state: {
      getPool,
      getConfig: (address: string) =>
        client.state.getPoolConfig(new PublicKey(address)),
      getByBaseMint: (address: string) =>
        client.state.getPoolByBaseMint(new PublicKey(address)),
      getByCreator: (address: string) =>
        client.state.getPoolsByCreator(new PublicKey(address)),
      getByConfig: (address: string) =>
        client.state.getPoolsByConfig(new PublicKey(address)),
      getMigrationThreshold: (address: string) =>
        client.state.getPoolMigrationQuoteThreshold(new PublicKey(address)),
      getProgress: (address: string) =>
        client.state.getPoolQuoteTokenCurveProgress(new PublicKey(address)),
      getFeeMetrics: (address: string) =>
        client.state.getPoolFeeMetrics(new PublicKey(address)),
      getFeeBreakdown: (address: string) =>
        client.state.getPoolFeeBreakdown(new PublicKey(address)),
      inspectQuoteMint,
    },
    async prepare(transaction: Transaction, payer: PublicKey) {
      if (transaction.signatures.some((signature) => signature.signature)) {
        throw new Error("Preparation requires an unsigned transaction.");
      }
      const prepared = new Transaction().add(...transaction.instructions);
      const block = await connection.getLatestBlockhash(commitment);
      prepared.feePayer = payer;
      prepared.recentBlockhash = block.blockhash;
      const message = prepared.compileMessage();
      const fee = await connection.getFeeForMessage(message, commitment);
      return {
        transaction: prepared,
        reviewedMessage: new Uint8Array(prepared.serializeMessage()),
        lastValidBlockHeight: block.lastValidBlockHeight,
        accounts: message.accountKeys.map((key) => key.toBase58()),
        requiredSigners: message.accountKeys
          .slice(0, message.header.numRequiredSignatures)
          .map((key) => key.toBase58()),
        feeLamports: fee.value,
      };
    },
    async simulate(transaction: Transaction) {
      const result = await connection.simulateTransaction(
        new VersionedTransaction(transaction.compileMessage()),
        { sigVerify: false, replaceRecentBlockhash: false },
      );
      if (result.value.err) {
        throw new Error(`Simulation failed: ${JSON.stringify(result.value.err)}`);
      }
      return result.value;
    },
  };
}

export type DBCServices = ReturnType<typeof createDBCServices>;

export function explainTransactionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/reject|declin/i.test(message)) {
    return "Wallet request rejected. Nothing was submitted.";
  }
  if (/blockhash|expired/i.test(message)) {
    return "Blockhash expired. Rebuild and review the transaction.";
  }
  if (/account.*not|not.*account/i.test(message)) {
    return "Account not found on the selected network.";
  }
  if (/429|fetch|network|403/i.test(message)) {
    return "RPC unavailable, mismatched or rate-limited. Execution paused.";
  }
  return message;
}

export function explorer(address: string, network: string) {
  const verified = new PublicKey(address).toBase58();
  return `https://explorer.solana.com/address/${verified}${network === "devnet" ? "?cluster=devnet" : ""}`;
}
