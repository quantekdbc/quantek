// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { TOKENIZED_QUOTE_ASSETS, validateTokenizedQuoteRegistry } from "@/lib/quantek/rwa";
import {
  QUANTEK_QUANTUM_WALLET_DOMAIN,
  QUANTEK_QUANTUM_WALLET_PROGRAM_ID,
  isQuantumWalletProtocolDeployed,
  prepareQuantumWalletSpend,
} from "@/lib/quantek/quantum-wallet";
import {
  LAUNCH_MODES,
  QUANTUM_SCHEMES,
  selectPoolCreationMethod,
  validateQuoteMintSelection,
} from "@/lib/quantek/launch-model";
import { productNavigation } from "@/lib/quantek/data";

describe("QUANTEK product expansion invariants", () => {
  it("ships all 61 Solana tokenized-market quote presets with valid unique public keys", () => {
    expect(TOKENIZED_QUOTE_ASSETS).toHaveLength(61);
    expect(validateTokenizedQuoteRegistry()).toBe(true);
    expect(new Set(TOKENIZED_QUOTE_ASSETS.map((asset) => asset.mint)).size).toBe(61);
    for (const asset of TOKENIZED_QUOTE_ASSETS) {
      expect(new PublicKey(asset.mint).toBase58()).toBe(asset.mint);
      expect(validateQuoteMintSelection(asset.mint)).toBe(true);
    }
  });

  it("models both Standard and Quantum DBC launch paths", () => {
    expect(LAUNCH_MODES).toEqual(["Standard", "Quantum"]);
    expect(QUANTUM_SCHEMES).toContain("QUANTEK Root");
    expect(QUANTUM_SCHEMES).toContain("ML-DSA-65");
    expect(selectPoolCreationMethod("None")).toBe("creator.createPool");
    expect(selectPoolCreationMethod("Creator")).toBe("creator.createPoolWithFirstBuy");
    expect(selectPoolCreationMethod("Partner + Creator")).toBe(
      "creator.createPoolWithPartnerAndCreatorFirstBuy",
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

  it("keeps the Quantum Wallet adapter fail-closed until QUANTEK deploys its own program", () => {
    expect(QUANTEK_QUANTUM_WALLET_PROGRAM_ID).toBeNull();
    expect(isQuantumWalletProtocolDeployed()).toBe(false);
    const plan = prepareQuantumWalletSpend({
      vaultIndex: 0,
      recipient: "11111111111111111111111111111111",
      asset: { kind: "sol", symbol: "SOL", mint: null, decimals: 9 },
      amountAtomic: 1n,
      nextPublicKeyHash: "ab".repeat(32),
    });
    expect(plan.liveExecutionAvailable).toBe(false);
    expect(plan.domain).toBe("quantek.network/quantum-wallet/v1");
    expect(plan.warning).toContain("not deployed");
  });

  it("uses QUANTEK-owned product domains rather than external protocol domains", () => {
    expect(QUANTEK_QUANTUM_WALLET_DOMAIN.startsWith("quantek.network/")).toBe(true);
    expect(QUANTEK_QUANTUM_WALLET_DOMAIN.toLowerCase()).not.toContain("pqc.market");
  });

  it("rejects malformed tokenized quote selections", () => {
    expect(validateQuoteMintSelection("not-a-solana-mint")).toBe(false);
    expect(validateQuoteMintSelection("")).toBe(false);
  });
});
