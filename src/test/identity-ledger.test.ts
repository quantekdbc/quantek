import { beforeEach, describe, expect, it } from "vitest";
import {
  anchorMemo,
  createLeafLedger,
  derivationMessage,
  type PublicIdentity,
} from "@/lib/quantek/identity";
import { DOMAINS } from "@/lib/quantek/pq";

describe("QUANTEK identity boundary", () => {
  beforeEach(() => localStorage.clear());

  it("uses QUANTEK-owned domains and qtk identity language", () => {
    expect(DOMAINS.identity).toBe("quantek.network/identity/v1");
    expect(DOMAINS.launch).toBe("quantek.network/launch/v1");
    expect(DOMAINS.proof).toBe("quantek.network/proof/v1");
    expect(DOMAINS.quantumWallet).toBe("quantek.network/quantum-wallet/v1");
    const message = derivationMessage(
      "11111111111111111111111111111111",
      "devnet",
    );
    expect(message).toContain("QUANTEK");
    expect(message).not.toContain("pqc.market");
  });

  it("never reuses a consumed one-time leaf", () => {
    const root = "ab".repeat(32);
    const ledger = createLeafLedger(root, localStorage);
    expect(ledger.next()).toBe(0);
    ledger.reserve(0, "registration");
    expect(ledger.isUsed(0)).toBe(true);
    expect(ledger.next()).toBe(1);
    expect(() => ledger.reserve(0, "reuse")).toThrow("already consumed");

    const reloaded = createLeafLedger(root, localStorage);
    expect(reloaded.isUsed(0)).toBe(true);
    expect(reloaded.state.purposes[0]).toBe("registration");
  });

  it("builds the QUANTEK Solana anchor memo namespace", () => {
    const identity: PublicIdentity = {
      address: "qtk1example",
      root: "ab".repeat(32),
      publicSeed: "cd".repeat(32),
      height: 8,
      leaves: 256,
      label: "reference",
      wallet: "11111111111111111111111111111111",
    };
    expect(anchorMemo(identity)).toBe(
      `quantek:v1:identity:qtk1example:${"ab".repeat(32)}`,
    );
  });
});
