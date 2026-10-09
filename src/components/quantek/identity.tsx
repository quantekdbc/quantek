import { useMemo, useState } from "react";
import { Fingerprint, KeyRound, Link2, LoaderCircle, ScanLine, ShieldCheck, TriangleAlert } from "lucide-react";
import { SolanaSignMessage, type SolanaSignMessageFeature } from "@solana/wallet-standard-features";
import { Button } from "@/components/ui/button";
import { Field, PageHeading, Panel, CopyValue } from "./controls";
import { Geometry } from "./geometry";
import { useConsole } from "@/lib/quantek/context";
import {
  QUANTEK_IDENTITY_DOMAIN,
  QUANTEK_IDENTITY_PARAMETERS,
  QUANTEK_PROOF_DOMAIN,
  buildIdentityAnchorMemo,
  buildIdentityDerivationMessage,
  createLeafLedger,
  deriveIdentityFromWalletSignature,
  signIdentityMessage,
  verifyIdentityProof,
  type DerivedIdentity,
  type IdentityProof,
} from "@/lib/quantek/identity";

type Stage = "Derive" | "Register" | "Anchor" | "Prove";
const stages: readonly Stage[] = ["Derive", "Register", "Anchor", "Prove"];

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function IdentityPage() {
  const c = useConsole();
  const [stage, setStage] = useState<Stage>("Derive");
  const [passphrase, setPassphrase] = useState("");
  const [harden, setHarden] = useState(false);
  const derived = c.identity;
  const setDerived = c.setIdentity;
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [registrationProof, setRegistrationProof] = useState<IdentityProof | null>(null);
  const [anchorMemo, setAnchorMemo] = useState("");
  const [nonce, setNonce] = useState("");
  const [possessionProof, setPossessionProof] = useState<IdentityProof | null>(null);
  const [proofValid, setProofValid] = useState<boolean | null>(null);

  const ledger = useMemo(
    () => (derived ? createLeafLedger(derived.profile.address) : null),
    [derived?.profile.address],
  );
  const used = ledger?.used() ?? [];
  const nextLeaf = ledger?.next();

  async function derive() {
    setNotice("");
    if (!c.wallet || !c.account) {
      setNotice("Connect a wallet-standard compatible Solana wallet before deriving a QUANTEK identity.");
      return;
    }
    const feature = c.wallet.features[SolanaSignMessage] as
      | SolanaSignMessageFeature[typeof SolanaSignMessage]
      | undefined;
    if (!feature) {
      setNotice("The connected wallet does not expose wallet-standard message signing.");
      return;
    }
    if (harden && passphrase.length < 12) {
      setNotice("Use at least 12 characters for the optional hardening passphrase.");
      return;
    }

    setBusy(true);
    setProgress(0);
    try {
      const message = new TextEncoder().encode(buildIdentityDerivationMessage(c.account.address));
      const outputs = await feature.signMessage({ account: c.account, message });
      const output = outputs[0];
      if (!output?.signature) throw new Error("Wallet returned no derivation signature.");
      const identity = await deriveIdentityFromWalletSignature(
        c.account.address,
        output.signature,
        harden ? passphrase : "",
        setProgress,
      );
      setDerived(identity);
      setPassphrase("");
      localStorage.setItem("quantek.identity.public-profile.v1", JSON.stringify(identity.profile));
      c.log("QUANTEK Identity derived locally", "Proof");
      setNotice("Identity derived locally. Raw secret seed material remains only in this page's memory.");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Identity derivation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function registerLocal() {
    if (!derived || !ledger) return;
    setNotice("");
    setBusy(true);
    try {
      if (ledger.isUsed(0)) throw new Error("Genesis leaf #0 is already consumed for this local identity profile.");
      const statement = JSON.stringify({
        wallet: derived.profile.wallet,
        address: derived.profile.address,
        root: derived.profile.root,
        publicSeed: derived.profile.publicSeed,
        height: QUANTEK_IDENTITY_PARAMETERS.merkleHeight,
        version: 1,
      });
      const proof = await signIdentityMessage(
        derived.secret,
        QUANTEK_IDENTITY_DOMAIN + "/registration",
        statement,
        0,
      );
      const result = verifyIdentityProof(proof);
      if (!result.valid) throw new Error("Local registration proof failed self-verification.");
      ledger.consume(0);
      setRegistrationProof(proof);
      localStorage.setItem(
        "quantek.identity.registration-public.v1",
        JSON.stringify({ profile: derived.profile, leaf: 0, proof }),
      );
      c.log("Local QUANTEK registration profile created", "Proof");
      setNotice("Local Registration Profile created and leaf #0 consumed. This is not a server/global registration.");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Could not create local registration profile.");
    } finally {
      setBusy(false);
    }
  }

  function prepareAnchor() {
    if (!derived) return;
    const memo = buildIdentityAnchorMemo(derived.profile.address, derived.profile.root);
    setAnchorMemo(memo);
    c.setPlan({
      title: "QUANTEK Identity · Anchor Plan",
      steps: [
        "Construct SPL Memo instruction with the exact QUANTEK identity anchor string.",
        "Assign the connected wallet as fee payer and fetch a fresh blockhash.",
        "Review the memo bytes and Solana cluster.",
        "Simulate the unsigned transaction.",
        "Request the connected wallet signature only after explicit confirmation.",
      ],
      accounts: [
        c.account ? "Wallet fee payer " + c.account.address : "Wallet fee payer (not connected)",
        "SPL Memo program",
      ],
      fee: "RPC estimate required",
      signatures: 1,
    });
    setNotice("Anchor review plan prepared. No memo has been signed, submitted, or confirmed.");
  }

  async function prove() {
    if (!derived || !ledger) return;
    setNotice("");
    const leaf = ledger.next();
    if (leaf === null) {
      setNotice("This identity has no remaining one-time leaves.");
      return;
    }
    const challenge = nonce || randomNonce();
    setNonce(challenge);
    setBusy(true);
    try {
      const message = JSON.stringify({ nonce: challenge, wallet: derived.profile.wallet, leaf });
      const proof = await signIdentityMessage(derived.secret, QUANTEK_PROOF_DOMAIN, message, leaf);
      const result = verifyIdentityProof(proof);
      if (!result.valid) throw new Error("Challenge proof failed local verification.");
      ledger.consume(leaf);
      setPossessionProof(proof);
      setProofValid(true);
      c.log("QUANTEK Identity proof of possession verified", "Proof");
      setNotice("Challenge proof verified locally and its one-time leaf has been consumed.");
    } catch (cause) {
      setProofValid(false);
      setNotice(cause instanceof Error ? cause.message : "Proof generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="QUANTEK IDENTITY / HASH-BASED ROOT"
        title="Identity"
        description="Derive a qtk1 identity locally, create a public registration profile, prepare a Solana anchor, and prove possession without reusing one-time leaves."
      />

      <div className="segmented mb-6" role="tablist" aria-label="Identity stages">
        {stages.map((value) => (
          <Button key={value} variant="ghost" role="tab" aria-selected={stage === value} className={stage === value ? "selected" : ""} onClick={() => setStage(value)}>
            {value}
          </Button>
        ))}
      </div>

      <div className="identity-layout">
        <div>
          <Panel title="Identity manifest" tag={derived ? "LOCAL / ACTIVE" : "NOT DERIVED"}>
            <div className="instrument-body">
              <div className="identity-header">
                <Geometry compact />
                <div>
                  <strong>{derived?.profile.address ?? "qtk1…not-derived"}</strong>
                  <p>{derived ? "QUANTEK LOCAL IDENTITY" : "CONNECT WALLET TO BEGIN"}</p>
                </div>
              </div>
              <Field label="Identity root"><div className="code-block">{derived?.profile.root ?? "Not derived"}</div></Field>
              {derived && <CopyValue value={derived.profile.root} />}
              <Field label="Public seed"><div className="code-block mt-3">{derived?.profile.publicSeed ?? "Not derived"}</div></Field>
              <div className="detail-rows mt-4">
                <div><span>Hash / WOTS</span><strong>SHA-256 · w=16 · 67 chains</strong></div>
                <div><span>Tree</span><strong>height 8 · 256 leaves</strong></div>
                <div><span>Signature</span><strong>2,404 bytes</strong></div>
                <div><span>Domain</span><strong>{QUANTEK_IDENTITY_DOMAIN}</strong></div>
              </div>
            </div>
          </Panel>

          {stage === "Derive" && (
            <Panel title="Derive" tag="LOCAL / NO TRANSACTION" className="mt-5">
              <div className="instrument-body">
                <Field label="Message the wallet will sign">
                  <div className="code-block">{buildIdentityDerivationMessage(c.account?.address ?? "<connect-wallet>")}</div>
                </Field>
                <label className="checkbox-label">
                  <input type="checkbox" checked={harden} onChange={(event) => { setHarden(event.target.checked); if (!event.target.checked) setPassphrase(""); }} />
                  Harden with passphrase · scrypt N=2^15, r=8, p=1
                </label>
                {harden && <Field label="Passphrase" hint="Never persisted by QUANTEK. Losing it prevents deterministic recovery of the same hardened identity."><input type="password" autoComplete="off" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} /></Field>}
                {busy && <div className="mt-5"><div className="progress-track"><progress max={1} value={progress} /></div><p className="micro mt-2">GENERATING 256 ONE-TIME KEYS · {Math.round(progress * 100)}%</p></div>}
                <Button className="mt-5" onClick={derive} disabled={busy}>
                  {busy ? <LoaderCircle className="animate-spin" /> : <Fingerprint />} Derive QUANTEK Identity
                </Button>
              </div>
            </Panel>
          )}

          {stage === "Register" && (
            <Panel title="Register" tag="LOCAL PROFILE" className="mt-5">
              <div className="instrument-body">
                <p className="text-sm leading-8 text-muted-foreground">Create a public local binding between the connected wallet, qtk1 address, identity root and public seed. Leaf #0 is consumed as the genesis proof.</p>
                <Button className="mt-5" onClick={registerLocal} disabled={!derived || busy || Boolean(ledger?.isUsed(0))}>
                  <KeyRound /> {ledger?.isUsed(0) ? "Genesis leaf already consumed" : "Create Local Registration Profile"}
                </Button>
                {registrationProof && <div className="notice mt-5"><ShieldCheck size={16}/>Genesis proof verified locally · leaf #{registrationProof.leaf} · no global registry implied.</div>}
              </div>
            </Panel>
          )}

          {stage === "Anchor" && (
            <Panel title="Anchor" tag="SPL MEMO REVIEW" className="mt-5">
              <div className="instrument-body">
                <p className="text-sm leading-8 text-muted-foreground">Prepare a Solana memo that timestamps the qtk identity root. QUANTEK does not mark an anchor as complete until the transaction is actually confirmed.</p>
                {derived && <div className="code-block mt-4">{buildIdentityAnchorMemo(derived.profile.address, derived.profile.root)}</div>}
                <Button className="mt-5" onClick={prepareAnchor} disabled={!derived}><Link2 /> Prepare Anchor Review</Button>
                {anchorMemo && <div className="notice mt-5"><TriangleAlert size={16}/>Prepared only. No anchor signature or confirmation exists yet.</div>}
              </div>
            </Panel>
          )}

          {stage === "Prove" && (
            <Panel title="Prove possession" tag="ONE-TIME CHALLENGE" className="mt-5">
              <div className="instrument-body">
                <Field label="Challenge nonce" hint="Leave blank to generate 32 random bytes."><input value={nonce} onChange={(event) => setNonce(event.target.value)} placeholder="Generated on proof" /></Field>
                <div className="detail-rows mt-4"><div><span>Next unused leaf</span><strong>{nextLeaf === null || nextLeaf === undefined ? "Exhausted / unavailable" : "#" + nextLeaf}</strong></div></div>
                <Button className="mt-5" onClick={prove} disabled={!derived || busy || nextLeaf === null}>
                  {busy ? <LoaderCircle className="animate-spin" /> : <ScanLine />} Generate & Verify Proof
                </Button>
                {possessionProof && <div className="notice mt-5">{proofValid ? <ShieldCheck size={16}/> : <TriangleAlert size={16}/>}Proof trace: 67 WOTS chains → leaf #{possessionProof.leaf} → 8 Merkle levels → root {proofValid ? "match" : "mismatch"}.</div>}
              </div>
            </Panel>
          )}
        </div>

        <div>
          <Panel title="Leaf budget" tag="ONE-TIME LEDGER">
            <div className="instrument-body">
              <div className="large-budget">{256 - used.length} <span>/ 256</span></div>
              <p className="micro">{used.length} CONSUMED · PUBLIC INDEXES ONLY</p>
              <div className="progress-track mt-5"><progress value={used.length} max={256} /></div>
              <div className="detail-rows mt-4">
                <div><span>Genesis leaf</span><strong>{used.includes(0) ? "Consumed" : "Available"}</strong></div>
                <div><span>Next leaf</span><strong>{nextLeaf === null || nextLeaf === undefined ? "—" : "#" + nextLeaf}</strong></div>
                <div><span>Secret persistence</span><strong>Memory only</strong></div>
              </div>
              <div className="notice mt-5"><TriangleAlert size={16}/>Local storage contains only public profile data and consumed leaf indexes. Raw secret seeds and passphrases are not written there.</div>
            </div>
          </Panel>
          <Panel title="Security boundary" className="mt-5">
            <div className="instrument-body">
              <ShieldCheck size={27} className="mb-5" />
              <p className="text-xs leading-7 text-muted-foreground">Identity proofs authenticate QUANTEK provenance. They do not change the authority model of an ordinary Solana account.</p>
              <p className="text-xs leading-7 text-muted-foreground mt-4">Hash-signature custody requires a dedicated on-chain verifier. See Quantum Wallets for the separate protocol design.</p>
            </div>
          </Panel>
        </div>
      </div>
      {notice && <div className="notice mt-6" role="status">{notice}</div>}
    </>
  );
}
