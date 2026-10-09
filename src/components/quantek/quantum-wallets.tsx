import { useMemo, useState } from "react";
import { ArrowRight, Boxes, Fingerprint, KeyRound, LockKeyhole, ShieldCheck, TriangleAlert, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, PageHeading, Panel } from "./controls";
import {
  QUANTEK_QUANTUM_WALLET_DOMAIN,
  QUANTEK_QUANTUM_WALLET_PROGRAM_ID,
  prepareQuantumWalletSpend,
} from "@/lib/quantek/quantum-wallet";

const demoHash = "7c".repeat(32);

export function QuantumWalletsPage() {
  const [tab, setTab] = useState<"Overview" | "Assets" | "Withdraw" | "Proof Trace">("Overview");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [asset, setAsset] = useState<"SOL" | "Token">("SOL");
  const [mint, setMint] = useState("");
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<ReturnType<typeof prepareQuantumWalletSpend> | null>(null);

  const status = useMemo(
    () => (QUANTEK_QUANTUM_WALLET_PROGRAM_ID ? "Adapter configured" : "Protocol adapter not deployed"),
    [],
  );

  function previewSpend() {
    setError("");
    setPlan(null);
    try {
      const numeric = Number(amount);
      if (!Number.isFinite(numeric) || numeric <= 0) throw new Error("Enter a valid spend amount.");
      const decimals = asset === "SOL" ? 9 : 6;
      const amountAtomic = BigInt(Math.floor(numeric * 10 ** decimals));
      const prepared = prepareQuantumWalletSpend({
        vaultIndex: 0,
        recipient,
        asset:
          asset === "SOL"
            ? { kind: "sol", symbol: "SOL", mint: null, decimals: 9 }
            : { kind: "token", symbol: "TOKEN", mint, decimals },
        amountAtomic,
        nextPublicKeyHash: demoHash,
      });
      setPlan(prepared);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not build Quantum Wallet preview.");
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="QUANTUM CUSTODY / HASH-SIGNATURE AUTHORITY"
        title="Quantum Wallets"
        description="A QUANTEK design for one-time hash-signature vaults whose spending authority lives in an on-chain verifier rather than an ordinary ed25519 account."
      />
      <div className="notice mb-6">
        <TriangleAlert size={17} />
        <span><strong>{status}.</strong> QUANTEK does not yet expose live Quantum Wallet custody. This page models the protocol and review flow without pointing at a third-party vault program.</span>
      </div>

      <div className="segmented mb-6" role="tablist" aria-label="Quantum Wallet sections">
        {(["Overview", "Assets", "Withdraw", "Proof Trace"] as const).map((value) => (
          <Button key={value} variant="ghost" role="tab" aria-selected={tab === value} className={tab === value ? "selected" : ""} onClick={() => setTab(value)}>
            {value}
          </Button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="strategy-layout">
          <Panel title="Quantum Wallet / 00" tag="REFERENCE STATE">
            <div className="instrument-body">
              <div className="identity-header">
                <div className="agent-orbit"><LockKeyhole /></div>
                <div><strong>One-time vault chain</strong><p>WOTS-16 · SHA-256 · rollover authority</p></div>
              </div>
              <div className="detail-rows">
                <div><span>Protocol namespace</span><strong>{QUANTEK_QUANTUM_WALLET_DOMAIN}</strong></div>
                <div><span>Program</span><strong>Not deployed</strong></div>
                <div><span>Current vault</span><strong>#000 · preview only</strong></div>
                <div><span>Spend state</span><strong>Unconsumed · reference</strong></div>
                <div><span>Next vault</span><strong>#001 · rollover target</strong></div>
              </div>
              <div className="notice mt-5"><ShieldCheck size={16}/>A real one-time spend must consume the current vault and commit the remainder to the next vault. UI state alone is not sufficient; this must be enforced on-chain.</div>
            </div>
          </Panel>
          <Panel title="Authority comparison" tag="SECURITY BOUNDARY">
            <div className="instrument-body">
              <div className="module-row"><div><strong>Connected Solana wallet</strong><p>Browser wallet remains authorized by Solana's ordinary signing model.</p></div><WalletCards /></div>
              <div className="module-row"><div><strong>Quantum Wallet</strong><p>Requires a dedicated program that verifies the WOTS spend itself.</p></div><Fingerprint /></div>
              <div className="module-row"><div><strong>QUANTEK Identity</strong><p>Provenance and proofs; not by itself custody authority.</p></div><KeyRound /></div>
            </div>
          </Panel>
        </div>
      )}

      {tab === "Assets" && (
        <Panel title="Vault assets" tag="DEMO INVENTORY">
          <div className="instrument-body">
            {[
              ["SOL", "Native", "0.000000", "Deposit address pending protocol deployment"],
              ["USDC", "SPL", "0.00", "Token account derived after vault program deployment"],
              ["Token-2022", "Extension-aware", "—", "Additional accounts may be required"],
            ].map(([symbol, type, balance, note]) => (
              <div className="module-row" key={symbol}>
                <div><strong>{symbol}</strong><p>{type} · {note}</p></div>
                <span className="micro">{balance}</span>
              </div>
            ))}
            <div className="notice mt-5"><Boxes size={16}/>Deposits remain disabled because QUANTEK has not deployed its own on-chain Quantum Wallet verifier. No deposit address is presented as live.</div>
          </div>
        </Panel>
      )}

      {tab === "Withdraw" && (
        <div className="strategy-layout">
          <Panel title="Prepare withdrawal" tag="READINESS PREVIEW">
            <div className="instrument-body">
              <Field label="Asset">
                <select value={asset} onChange={(event) => setAsset(event.target.value as "SOL" | "Token")}><option>SOL</option><option>Token</option></select>
              </Field>
              {asset === "Token" && <div className="mt-5"><Field label="Token mint"><input value={mint} onChange={(event) => setMint(event.target.value)} placeholder="Solana mint address" /></Field></div>}
              <div className="form-grid mt-5">
                <Field label="Recipient"><input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Solana address" /></Field>
                <Field label="Amount"><input type="number" min="0" step="any" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
              </div>
              {error && <div className="error-message" role="alert">{error}</div>}
              <Button className="mt-5" onClick={previewSpend}>Generate readiness plan <ArrowRight /></Button>
            </div>
          </Panel>
          <Panel title="One-time spend commitment" tag="NO LIVE EXECUTION">
            <div className="instrument-body">
              {plan ? <>
                <div className="detail-rows">
                  <div><span>Domain</span><strong>{plan.domain}</strong></div>
                  <div><span>Recipient</span><strong>{plan.recipient.slice(0, 10)}…</strong></div>
                  <div><span>Amount (atomic)</span><strong>{plan.amountAtomic}</strong></div>
                  <div><span>Signature staging</span><strong>{plan.staging.suggestedChunks} chunks · reference</strong></div>
                  <div><span>Rollover</span><strong>{plan.nextPublicKeyHash.slice(0, 12)}…</strong></div>
                </div>
                <div className="notice mt-4"><TriangleAlert size={16}/>{plan.warning}</div>
              </> : <div className="empty-state">Create a readiness plan to inspect what a future on-chain Quantum Wallet spend must commit to.</div>}
            </div>
          </Panel>
        </div>
      )}

      {tab === "Proof Trace" && (
        <Panel title="Spend proof trace" tag="REFERENCE PIPELINE">
          <div className="instrument-body">
            <div className="verification-pipeline">
              {["Intent", "Digest", "WOTS chains", "Public-key hash", "Vault authority", "Rollover"].map((name, index) => (
                <div className="pipeline-step" key={name}><span className="block mb-3 font-mono">0{index + 1}</span>{name}</div>
              ))}
            </div>
            <div className="notice mt-5"><Fingerprint size={16}/>A production verifier must rebuild the spend digest from instruction parameters, verify the staged WOTS payload, bind it to the current vault, and enforce one-time rollover on-chain.</div>
          </div>
        </Panel>
      )}
    </>
  );
}
