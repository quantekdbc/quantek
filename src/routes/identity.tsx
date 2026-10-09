import { createFileRoute } from "@tanstack/react-router";
import { IdentityPage } from "@/components/quantek/identity";
import { metadata } from "@/lib/quantek/data";

export const Route = createFileRoute("/identity")({
  head: () => metadata("Identity", "Derive, register, anchor and prove a QUANTEK qtk1 hash-based identity."),
  component: IdentityPage,
});
