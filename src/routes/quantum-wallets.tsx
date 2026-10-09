import { createFileRoute } from "@tanstack/react-router";
import { QuantumWalletsPage } from "@/components/quantek/quantum-wallets";
import { metadata } from "@/lib/quantek/data";

export const Route = createFileRoute("/quantum-wallets")({
  head: () =>
    metadata(
      "Quantum Wallets",
      "QUANTEK Quantum Wallet protocol design for one-time WOTS-controlled Solana vaults.",
    ),
  component: QuantumWalletsPage,
});
