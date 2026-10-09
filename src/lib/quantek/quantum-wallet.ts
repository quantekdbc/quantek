import { PublicKey } from "@solana/web3.js";

export const QUANTEK_QUANTUM_WALLET_PROGRAM_ID: string | null = null;
export const QUANTEK_QUANTUM_WALLET_DOMAIN = "quantek.network/quantum-wallet/v1";

export type QuantumWalletAsset =
  | { kind: "sol"; symbol: "SOL"; mint: null; decimals: 9 }
  | { kind: "token"; symbol: string; mint: string; decimals: number; tokenProgram?: string };

export type QuantumWalletPreview = {
  index: number;
  publicKeyHash: string;
  vaultAddress: string | null;
  nextPublicKeyHash: string;
  nextVaultAddress: string | null;
  consumed: boolean;
};

export type QuantumWalletSpendIntent = {
  vaultIndex: number;
  recipient: string;
  asset: QuantumWalletAsset;
  amountAtomic: bigint;
  nextPublicKeyHash: string;
};

export type QuantumWalletSpendPlan = {
  liveExecutionAvailable: false;
  domain: typeof QUANTEK_QUANTUM_WALLET_DOMAIN;
  recipient: string;
  mint: string | null;
  amountAtomic: string;
  nextPublicKeyHash: string;
  staging: {
    required: true;
    reason: "WOTS payload exceeds a single Solana transaction packet";
    suggestedChunks: 3;
  };
  warning: string;
};

export function isQuantumWalletProtocolDeployed(): boolean {
  return QUANTEK_QUANTUM_WALLET_PROGRAM_ID !== null;
}

export function prepareQuantumWalletSpend(intent: QuantumWalletSpendIntent): QuantumWalletSpendPlan {
  if (isQuantumWalletProtocolDeployed()) {
    throw new Error(
      "Live Quantum Wallet execution requires the deployed-program adapter, which is intentionally not enabled in this build.",
    );
  }

  new PublicKey(intent.recipient);
  if (intent.asset.kind === "token") new PublicKey(intent.asset.mint);
  if (intent.amountAtomic <= 0n) throw new Error("Quantum Wallet spend amount must be greater than zero.");
  if (!/^[a-f0-9]{64}$/i.test(intent.nextPublicKeyHash)) {
    throw new Error("Next Quantum Wallet public-key hash must be 32-byte hexadecimal.");
  }

  return {
    liveExecutionAvailable: false,
    domain: QUANTEK_QUANTUM_WALLET_DOMAIN,
    recipient: intent.recipient,
    mint: intent.asset.kind === "sol" ? null : intent.asset.mint,
    amountAtomic: intent.amountAtomic.toString(),
    nextPublicKeyHash: intent.nextPublicKeyHash.toLowerCase(),
    staging: {
      required: true,
      reason: "WOTS payload exceeds a single Solana transaction packet",
      suggestedChunks: 3,
    },
    warning:
      "Protocol adapter not deployed. This is a deterministic readiness preview only; no vault transaction can be signed or submitted.",
  };
}
