import { createFileRoute } from "@tanstack/react-router";
import { DocsPage } from "@/components/quantek/docs";
import { metadata } from "@/lib/quantek/data";

export const Route = createFileRoute("/docs")({
  head: () => metadata("Docs", "QUANTEK technical reference for identity, Quantum Launch, Quantum Wallets and Meteora DBC."),
  component: DocsPage,
});
