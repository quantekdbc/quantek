// @vitest-environment node
import { describe, expect, it } from "vitest";
import { TOKENIZED_QUOTE_ASSETS, validateTokenizedQuoteRegistry } from "@/lib/quantek/rwa";
import {
  QUANTEK_QUANTUM_WALLET_DOMAIN,
  QUANTEK_QUANTUM_WALLET_PROGRAM_ID,
  isQuantumWalletProtocolDeployed,
  prepareQuantumWalletSpend,
} from "@/lib/quantek/quantum-wallet";

describe("QUANTEK product expansion invariants", () => {
  it("ships all 61 Solana tokenized-market quote presets with valid unique public keys", () => {
    expect(TOKENIZED_QUOTE_ASSETS).toHaveLength(61);
    expect(validateTokenizedQuoteRegistry()).toBe(true);
    expect(new Set(TOKENIZED_QUOTE_ASSETS.map((asset) => asset.mint)).size).toBe(61);
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
});
