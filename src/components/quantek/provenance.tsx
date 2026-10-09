import { useState } from "react";
import { z } from "zod";
import {
  Check,
  Fingerprint,
  LoaderCircle,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyValue, Field, PageHeading, Panel } from "./controls";
import { useConsole } from "@/lib/quantek/context";
import {
  QUANTEK_LAUNCH_DOMAIN,
  QUANTEK_PROOF_DOMAIN,
  verifyIdentityProof,
  type IdentityProof,
} from "@/lib/quantek/identity";
import { QUANTEK_QUANTUM_WALLET_DOMAIN } from "@/lib/quantek/quantum-wallet";

const identityProofSchema = z.object({
  kind: z.literal("quantek-wots-merkle-v1"),
  domain: z.string().min(1).max(160),
  message: z.string().min(1).max(100_000),
  leaf: z.number().int().min(0).max(255),
  publicSeed: z.string().regex(/^[0-9a-f]{64}$/i),
  root: z.string().regex(/^[0-9a-f]{64}$/i),
  signature: z.array(z.string().regex(/^[0-9a-f]{64}$/i)).length(67),
  authPath: z.array(z.string().regex(/^[0-9a-f]{64}$/i)).length(8),
});

type VerificationMode = "Launch attestation" | "Identity proof" | "Quantum Wallet spend proof";

const modeDomain: Record<VerificationMode, string> = {
  "Launch attestation": QUANTEK_LAUNCH_DOMAIN,
  "Identity proof": QUANTEK_PROOF_DOMAIN,
  "Quantum Wallet spend proof": QUANTEK_QUANTUM_WALLET_DOMAIN,
};

export function VerifyPage() {
  const c = useConsole();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<VerificationMode>("Launch attestation");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<{
    valid: boolean;
    computedRoot: string;
    digest: string;
    proof: IdentityProof;
  } | null>(null);
  const [error, setError] = useState("");

  async function verify() {
    setError("");
    setResult(null);
    setStage(0);
    setBusy(true);
    try {
      if (input.length > 120_000) throw new Error("Proof payload exceeds the local verifier limit.");
      const parsed = identityProofSchema.parse(JSON.parse(input)) as IdentityProof;
      const expectedDomain = modeDomain[mode];
      if (parsed.domain !== expectedDomain && !parsed.domain.startsWith(expectedDomain + "/")) {
        throw new Error(
          `This ${mode.toLowerCase()} must use the QUANTEK domain ${expectedDomain}.`,
        );
      }
      setStage(1);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      setStage(2);
      const checked = verifyIdentityProof(parsed);
      setStage(checked.valid ? 6 : 4);
      setResult({ ...checked, proof: parsed });
      c.log(
        `${mode} verification ${checked.valid ? "valid" : "invalid"}`,
        "Proof",
      );
    } catch (cause) {
      setError(
        cause instanceof z.ZodError
          ? "Invalid QUANTEK proof envelope. Expected 67 WOTS chain values and 8 Merkle siblings."
          : cause instanceof Error
            ? cause.message
            : "Verification failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  const pipeline =
    mode === "Quantum Wallet spend proof"
      ? ["Input", "Spend digest", "67 signature chains", "Vault key / root", "Root match", "Result"]
      : ["Input", "Digest", "67 signature chains", "8-level Merkle path", "Identity root", "Result"];

  return (
    <>
      <PageHeading
        eyebrow="QUANTEK VERIFY / INDEPENDENT PROOF TRACE"
        title="Verify"
        description="Verify Quantum Launch attestations, identity possession proofs, or local/reference Quantum Wallet spend proofs without trusting a QUANTEK server."
      />

      <Panel title="Verification input" tag="LOCAL SHA-256">
        <div className="instrument-body">
          <div className="segmented mb-5" role="tablist" aria-label="Verification category">
            {(["Launch attestation", "Identity proof", "Quantum Wallet spend proof"] as const).map(
              (value) => (
                <Button
                  key={value}
                  variant="ghost"
                  role="tab"
                  aria-selected={mode === value}
                  className={mode === value ? "selected" : ""}
                  onClick={() => {
                    setMode(value);
                    setInput("");
                    setError("");
                    setResult(null);
                    setStage(0);
                  }}
                >
                  {value}
                </Button>
              ),
            )}
          </div>

          <div className="notice mb-5">
            <Fingerprint size={16} />
            Expected domain: <code>{modeDomain[mode]}</code>
            {mode === "Quantum Wallet spend proof" && (
              <span>
                {" "}· reference verification only while the QUANTEK on-chain Quantum Wallet adapter remains undeployed.
              </span>
            )}
          </div>

          <Field label="QUANTEK proof JSON">
            <textarea
              value={input}
              disabled={busy}
              maxLength={120_000}
              onChange={(event) => {
                setInput(event.target.value);
                setError("");
                setResult(null);
                setStage(0);
              }}
              placeholder={"Paste a quantek-wots-merkle-v1 proof envelope…"}
            />
          </Field>

          <div className="form-actions">
            <span className="micro">SELF-CONTAINED PUBLIC PROOF · NO REMOTE LOOKUP REQUIRED</span>
            <Button onClick={verify} disabled={busy || !input.trim()}>
              {busy ? <LoaderCircle className="animate-spin" /> : <ScanLine />}
              Verify proof
            </Button>
          </div>
          {error && <div className="error-message" role="alert">{error}</div>}
        </div>
      </Panel>

      <div className="verification-pipeline">
        {pipeline.map((name, index) => (
          <div
            key={name}
            className={"pipeline-step " + (index < stage ? "passed" : "")}
          >
            {result && !result.valid && index >= 4 ? (
              <TriangleAlert />
            ) : busy && index === stage ? (
              <LoaderCircle className="animate-spin" />
            ) : index < stage ? (
              <Check />
            ) : (
              <span className="block mb-3 font-mono">0{index + 1}</span>
            )}
            <div>{name}</div>
          </div>
        ))}
      </div>

      {result && (
        <>
          <div className="result-banner" role="status">
            {result.valid ? <ShieldCheck size={28} /> : <TriangleAlert size={28} />}
            <div>
              <h3>{result.valid ? "Valid QUANTEK proof" : "Invalid proof · Root mismatch"}</h3>
              <p>
                {result.valid
                  ? `67 WOTS chains and 8 Merkle levels resolve to the supplied identity root for leaf #${result.proof.leaf}.`
                  : "The computed root does not match the claimed root. Do not trust this proof."}
              </p>
            </div>
          </div>

          <div className="form-grid mt-6">
            <Panel title="Computed root">
              <div className="instrument-body">
                <div className="code-block">{result.computedRoot}</div>
                <CopyValue value={result.computedRoot} />
              </div>
            </Panel>
            <Panel title="Message digest">
              <div className="instrument-body">
                <div className="code-block">{result.digest}</div>
                <CopyValue value={result.digest} />
              </div>
            </Panel>
          </div>

          <Panel title="Proof trace" tag="WOTS-16 / MERKLE H=8" className="mt-6">
            <div className="instrument-body">
              <div className="detail-rows">
                <div><span>Proof kind</span><strong>{result.proof.kind}</strong></div>
                <div><span>Domain</span><strong>{result.proof.domain}</strong></div>
                <div><span>Leaf</span><strong>#{result.proof.leaf}</strong></div>
                <div><span>Signature chains</span><strong>67</strong></div>
                <div><span>Merkle siblings</span><strong>8</strong></div>
                <div><span>Public seed</span><strong>{result.proof.publicSeed.slice(0, 18)}…</strong></div>
              </div>
            </div>
          </Panel>
        </>
      )}

      <div className="notice mt-6">
        <ShieldCheck size={17} />
        A valid provenance proof authenticates the QUANTEK identity root and signed message. It does not by itself authorize or protect ordinary Solana wallet funds.
      </div>
    </>
  );
}
