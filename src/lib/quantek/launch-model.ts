import { PublicKey } from "@solana/web3.js";

export const LAUNCH_MODES = ["Standard", "Quantum"] as const;
export type LaunchMode = (typeof LAUNCH_MODES)[number];

export const QUANTUM_SCHEMES = [
  "QUANTEK Root",
  "ML-DSA-65",
  "SLH-DSA-SHA2-128s",
  "FN-DSA / Falcon-512",
  "Hybrid ed25519 + ML-DSA-65",
] as const;
export type QuantumScheme = (typeof QUANTUM_SCHEMES)[number];

export type FirstBuyMode = "None" | "Creator" | "Partner + Creator";

export function selectPoolCreationMethod(firstBuyMode: FirstBuyMode) {
  if (firstBuyMode === "Partner + Creator") {
    return "creator.createPoolWithPartnerAndCreatorFirstBuy" as const;
  }
  if (firstBuyMode === "Creator") return "creator.createPoolWithFirstBuy" as const;
  return "creator.createPool" as const;
}

export function validateQuoteMintSelection(mint: string) {
  try {
    return new PublicKey(mint).toBase58() === mint;
  } catch {
    return false;
  }
}
