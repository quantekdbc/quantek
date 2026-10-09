// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { RWA_PRESETS, isValidMint } from "@/lib/quantek/rwa";
import {
  QUANTEK_QUANTUM_WALLET_PROGRAM_ID,
  canExecuteLive,
  createQuantumWalletAdapter,
  ProtocolNotDeployedError,
  stagingPlan,
} from "@/lib/quantek/quantum-wallet";
import { DOMAINS, PQ_PARAMETERS } from "@/lib/quantek/pq";
import { launchSchema, SIGNATURE_SCHEMES } from "@/lib/quantek/validation";
import { productNavigation } from "@/lib/quantek/data";

const baseLaunch = {
  mode: "standard" as const,
  scheme: "wots" as const,
  image: "",
  name: "Quantek Test",
  symbol: "QTEST",
  description: "",
  twitter: "",
  website: "",
  metadata: "",
  decimals: 9,
  supply: 1_000_000,
  tokenType: "SPL" as const,
  builder: "Market Cap" as const,
  initialCap: 10_000,
  migrationCap: 100_000,
  quoteThreshold: 800,
  supplyMigration: 80,
  startingBps: 200,
  endingBps: 50,
  scheduler: "Linear" as const,
  dynamic: true,
  collectMode: "Quote only" as const,
  creatorFee: 20,
  creationFee: 0,
  dammFee: 25,
  partnerLiquidity: 20,
  creatorLiquidity: 80,
  partnerLocked: 0,
  creatorLocked: 40,
  vesting: 90,
  leftoverReceiver: "",
  quoteKind: "crypto" as const,
  quote: "SOL" as const,
  customMint: "",
  tokenizedMint: "",
  firstBuy: "none" as const,
  firstBuyAmount: 0,
};

describe("QUANTEK product expansion invariants", () => {
  it("ships 61 unique tokenized-market presets with valid Solana public keys", () => {
    expect(RWA_PRESETS).toHaveLength(61);
    expect(new Set(RWA_PRESETS.map((asset) => asset.mint)).size).toBe(61);
    for (const asset of RWA_PRESETS) {
      expect(new PublicKey(asset.mint).toBase58()).toBe(asset.mint);
      expect(isValidMint(asset.mint)).toBe(true);
    }
  });

  it("validates both Standard and Quantum launch modes", () => {
    expect(launchSchema.safeParse(baseLaunch).success).toBe(true);
    expect(launchSchema.safeParse({ ...baseLaunch, mode: "quantum" }).success).toBe(true);
    expect(SIGNATURE_SCHEMES.map((scheme) => scheme.id)).toEqual(
      expect.arrayContaining(["wots", "ml-dsa-65", "slh-dsa", "fn-dsa", "hybrid"]),
    );
  });

  it("exposes every required product top-navigation route", () => {
    expect(productNavigation).toEqual([
      ["Launch", "/launch"],
      ["Identity", "/identity"],
      ["Quantum Wallets", "/quantum-wallets"],
      ["Verify", "/verify"],
      ["Docs", "/docs"],
    ]);
  });

  it("keeps Quantum Wallet live execution fail-closed until a QUANTEK program is deployed", async () => {
    expect(QUANTEK_QUANTUM_WALLET_PROGRAM_ID).toBeNull();
    expect(canExecuteLive()).toBe(false);
    expect(stagingPlan(PQ_PARAMETERS.signatureBytes)).toHaveLength(3);
    const adapter = createQuantumWalletAdapter();
    expect(adapter.deployed).toBe(false);
    await expect(
      adapter.buildWithdraw({
        recipient: "11111111111111111111111111111111",
        mint: "SOL",
        amount: 1,
        vaultIndex: 0,
      }),
    ).rejects.toBeInstanceOf(ProtocolNotDeployedError);
  });

  it("uses only QUANTEK-owned cryptographic product domains", () => {
    for (const domain of Object.values(DOMAINS)) {
      expect(domain.startsWith("quantek.network/")).toBe(true);
    }
  });

  it("rejects malformed tokenized quote selections and invalid base decimals", () => {
    expect(isValidMint("not-a-solana-mint")).toBe(false);
    expect(launchSchema.safeParse({ ...baseLaunch, decimals: 5 }).success).toBe(false);
    expect(
      launchSchema.safeParse({
        ...baseLaunch,
        quoteKind: "tokenized",
        tokenizedMint: "not-a-solana-mint",
      }).success,
    ).toBe(false);
  });
});
