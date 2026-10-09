import { beforeEach, describe, expect, it } from "vitest";
import {
  QUANTEK_IDENTITY_DOMAIN,
  QUANTEK_LAUNCH_DOMAIN,
  QUANTEK_PROOF_DOMAIN,
  buildIdentityAnchorMemo,
  buildIdentityDerivationMessage,
  createLeafLedger,
} from "@/lib/quantek/identity";

describe("QUANTEK identity boundary", () => {
  beforeEach(() => localStorage.clear());

  it("uses QUANTEK-owned domains and qtk identity language", () => {
    expect(QUANTEK_IDENTITY_DOMAIN).toBe("quantek.network/identity/v1");
    expect(QUANTEK_LAUNCH_DOMAIN).toBe("quantek.network/launch/v1");
    expect(QUANTEK_PROOF_DOMAIN).toBe("quantek.network/proof/v1");
    const message = buildIdentityDerivationMessage("11111111111111111111111111111111");
    expect(message).toContain("QUANTEK");
    expect(message).not.toContain("pqc.market");
  });

  it("never reuses a consumed one-time leaf", () => {
    const ledger = createLeafLedger("qtk1test");
    expect(ledger.next()).toBe(0);
    ledger.consume(0);
    expect(ledger.isUsed(0)).toBe(true);
    expect(ledger.next()).toBe(1);
    expect(() => ledger.consume(0)).toThrow("already been consumed");
  });

  it("builds a QUANTEK Solana anchor memo namespace", () => {
    const memo = buildIdentityAnchorMemo("qtk1example", "ab".repeat(32));
    expect(memo).toBe(`quantek:v1:identity:qtk1example:${"ab".repeat(32)}`);
  });
});
