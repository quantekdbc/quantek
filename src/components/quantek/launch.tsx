import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Code2,
  ExternalLink,
  Fingerprint,
  LoaderCircle,
  Rocket,
  Search,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { sha256 } from "@noble/hashes/sha256";
import { utf8ToBytes } from "@noble/hashes/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Field, PageHeading, Panel } from "./controls";
import { Sparkline } from "./geometry";
import { useConsole } from "@/lib/quantek/context";
import {
  DBC_PROGRAM_ID,
  DEFAULT_MIGRATION,
  USDC_MINT,
  WRAPPED_SOL_MINT,
  createDBCServices,
  type QuoteMintInspection,
} from "@/lib/quantek/dbc";
import {
  TOKENIZED_QUOTE_ASSETS,
  searchTokenizedQuoteAssets,
  type TokenizedQuoteAsset,
} from "@/lib/quantek/rwa";
import {
  QUANTEK_LAUNCH_DOMAIN,
  createLeafLedger,
  signIdentityMessage,
  verifyIdentityProof,
  type IdentityProof,
} from "@/lib/quantek/identity";

type LaunchMode = "Standard" | "Quantum";
type Step = "Asset" | "Curve" | "Fees" | "Migration" | "Quote Market" | "First Buy" | "Review";
type QuoteClass = "Crypto" | "Tokenized Market";
type CryptoQuote = "SOL" | "USDC" | "Custom Mint";
type QuantumScheme =
  | "QUANTEK Root"
  | "ML-DSA-65"
  | "SLH-DSA-SHA2-128s"
  | "FN-DSA / Falcon-512"
  | "Hybrid ed25519 + ML-DSA-65";

const steps: readonly Step[] = ["Asset", "Curve", "Fees", "Migration", "Quote Market", "First Buy", "Review"];

const schemeInfo: Record<QuantumScheme, { label: string; status: string; live: boolean }> = {
  "QUANTEK Root": {
    label: "WOTS-16 + Merkle h=8 · 2,404 B one-time proof",
    status: "Local reference implementation",
    live: true,
  },
  "ML-DSA-65": {
    label: "FIPS 204 · many-time key certified by QUANTEK Root",
    status: "Production cryptographic implementation pending",
    live: false,
  },
  "SLH-DSA-SHA2-128s": {
    label: "FIPS 205 · stateless hash-based many-time signature",
    status: "Production cryptographic implementation pending",
    live: false,
  },
  "FN-DSA / Falcon-512": {
    label: "Compact lattice signature",
    status: "Experimental · final FIPS integration pending",
    live: false,
  },
  "Hybrid ed25519 + ML-DSA-65": {
    label: "Dual classical + post-quantum signature",
    status: "Advanced experimental",
    live: false,
  },
};

type Draft = {
  name: string;
  symbol: string;
  description: string;
  image: string;
  metadata: string;
  twitter: string;
  website: string;
  decimals: number;
  supply: number;
  tokenType: "SPL Token" | "Token-2022";
  builder: "Market Cap" | "Two Segments" | "Liquidity Weights" | "Custom";
  initialCap: number;
  migrationCap: number;
  quoteThreshold: number;
  supplyMigration: number;
  startingBps: number;
  endingBps: number;
  scheduler: "Linear" | "Exponential" | "Fixed";
  dynamic: boolean;
  collectMode: "Quote token" | "Both tokens";
  creatorFee: number;
  creationFee: number;
  migratedPoolFee: "Dynamic" | "Static 25 bps" | "Static 100 bps" | "Custom";
  partnerLiquidity: number;
  creatorLiquidity: number;
  permanentLock: number;
  vestingDays: number;
  surplusReceiver: "Creator" | "Partner";
  quoteClass: QuoteClass;
  cryptoQuote: CryptoQuote;
  customMint: string;
  tokenizedMint: string;
  firstBuyEnabled: boolean;
  firstBuyMode: "Creator" | "Partner + Creator";
  creatorBuy: number;
  partnerBuy: number;
};

const initial: Draft = {
  name: "",
  symbol: "",
  description: "",
  image: "",
  metadata: "",
  twitter: "",
  website: "",
  decimals: 9,
  supply: 1_000_000_000,
  tokenType: "SPL Token",
  builder: "Market Cap",
  initialCap: 10_000,
  migrationCap: 100_000,
  quoteThreshold: 800,
  supplyMigration: 80,
  startingBps: 200,
  endingBps: 50,
  scheduler: "Linear",
  dynamic: true,
  collectMode: "Quote token",
  creatorFee: 20,
  creationFee: 0,
  migratedPoolFee: "Dynamic",
  partnerLiquidity: 20,
  creatorLiquidity: 80,
  permanentLock: 50,
  vestingDays: 90,
  surplusReceiver: "Creator",
  quoteClass: "Crypto",
  cryptoQuote: "SOL",
  customMint: "",
  tokenizedMint: "",
  firstBuyEnabled: false,
  firstBuyMode: "Creator",
  creatorBuy: 0,
  partnerBuy: 0,
};

function asHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function urlOkay(value: string) {
  if (!value) return true;
  return /^https:\/\//i.test(value) || /^ipfs:\/\//i.test(value);
}

export function LaunchPage() {
  const c = useConsole();
  const [mode, setMode] = useState<LaunchMode>("Standard");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initial);
  const [error, setError] = useState("");
  const [showJson, setShowJson] = useState(false);
  const [rwaSearch, setRwaSearch] = useState("");
  const [inspection, setInspection] = useState<QuoteMintInspection | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [scheme, setScheme] = useState<QuantumScheme>("QUANTEK Root");
  const [attestation, setAttestation] = useState<IdentityProof | null>(null);
  const [attesting, setAttesting] = useState(false);

  const filteredRwa = useMemo(() => searchTokenizedQuoteAssets(rwaSearch), [rwaSearch]);
  const selectedRwa = TOKENIZED_QUOTE_ASSETS.find((asset) => asset.mint === draft.tokenizedMint);

  const quoteMint = useMemo(() => {
    if (draft.quoteClass === "Tokenized Market") return draft.tokenizedMint || draft.customMint;
    if (draft.cryptoQuote === "SOL") return WRAPPED_SOL_MINT;
    if (draft.cryptoQuote === "USDC") return USDC_MINT;
    return draft.customMint;
  }, [draft.quoteClass, draft.cryptoQuote, draft.customMint, draft.tokenizedMint]);

  const curvePoints = useMemo(() => {
    const bias =
      draft.builder === "Market Cap" ? 1 :
      draft.builder === "Two Segments" ? 1.12 :
      draft.builder === "Liquidity Weights" ? 0.9 : 1.25;
    return [9, 13, 18, 24, 31, 39, 48, 58, 67, 75, 82, 88, 93, 96].map((value) =>
      Math.min(98, value * bias),
    );
  }, [draft.builder]);

  const launchPayload = useMemo(
    () => ({
      domain: QUANTEK_LAUNCH_DOMAIN,
      version: 1,
      launchMode: mode,
      creatorWallet: c.account?.address ?? null,
      token: {
        name: draft.name,
        symbol: draft.symbol,
        decimals: draft.decimals,
        supply: draft.supply,
        standard: draft.tokenType,
        metadata: draft.metadata,
      },
      dbc: {
        programId: DBC_PROGRAM_ID,
        migration: "MET_DAMM_V2",
        builder: draft.builder,
        initialCap: draft.initialCap,
        migrationCap: draft.migrationCap,
        quoteThreshold: draft.quoteThreshold,
        quoteMint: quoteMint || null,
      },
      quantum:
        mode === "Quantum"
          ? {
              identity: c.identity?.profile.address ?? null,
              root: c.identity?.profile.root ?? null,
              publicSeed: c.identity?.profile.publicSeed ?? null,
              scheme,
            }
          : null,
    }),
    [c.account?.address, c.identity, draft, mode, quoteMint, scheme],
  );

  const launchDigest = useMemo(
    () => asHex(sha256(utf8ToBytes(JSON.stringify(launchPayload)))),
    [launchPayload],
  );

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
    if (["quoteClass", "cryptoQuote", "customMint", "tokenizedMint"].includes(key)) {
      setInspection(null);
    }
    setAttestation(null);
  }

  function validate(currentStep: number) {
    if (currentStep === 0) {
      if (!draft.name.trim()) return "Token name is required.";
      if (!/^[A-Z0-9]{1,10}$/.test(draft.symbol)) return "Ticker must be 1–10 uppercase letters or digits.";
      if (draft.decimals < 6 || draft.decimals > 9) return "Meteora DBC base token decimals must be between 6 and 9.";
      if (!(draft.supply > 0)) return "Total supply must be greater than zero.";
      if (![draft.image, draft.metadata, draft.website].every(urlOkay)) return "Use HTTPS or IPFS for URI fields.";
    }
    if (currentStep === 1) {
      if (!(draft.initialCap > 0) || draft.migrationCap <= draft.initialCap) {
        return "Migration market cap must be greater than the initial market cap.";
      }
      if (!(draft.quoteThreshold > 0)) return "Migration quote threshold must be greater than zero.";
      if (draft.supplyMigration <= 0 || draft.supplyMigration > 100) return "Supply at migration must be between 0 and 100%.";
    }
    if (currentStep === 2) {
      if (draft.startingBps < 0 || draft.endingBps < 0 || draft.startingBps > 10_000 || draft.endingBps > 10_000) {
        return "Fees must be between 0 and 10,000 bps.";
      }
      if (draft.scheduler !== "Fixed" && draft.endingBps > draft.startingBps) {
        return "Ending fee cannot exceed starting fee for a decaying schedule.";
      }
    }
    if (currentStep === 3 && draft.partnerLiquidity + draft.creatorLiquidity !== 100) {
      return "Partner and creator migration liquidity must total 100%.";
    }
    if (currentStep === 4) {
      if (!quoteMint) return "Choose or enter a quote mint.";
      try {
        new PublicKey(quoteMint);
      } catch {
        return "Quote mint is not a valid Solana public key.";
      }
    }
    if (currentStep === 5 && draft.firstBuyEnabled) {
      if (draft.firstBuyMode === "Creator" && draft.creatorBuy <= 0) {
        return "Enter a creator first-buy amount.";
      }
      if (
        draft.firstBuyMode === "Partner + Creator" &&
        (draft.creatorBuy <= 0 || draft.partnerBuy <= 0)
      ) {
        return "Enter both partner and creator first-buy amounts.";
      }
    }
    if (mode === "Quantum" && currentStep === 6 && !c.identity) {
      return "Derive a QUANTEK Identity before preparing a Quantum Launch attestation.";
    }
    return "";
  }

  function next() {
    const issue = validate(step);
    if (issue) {
      setError(issue);
      return;
    }
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  async function inspectQuote() {
    if (!quoteMint) {
      setError("Choose a quote mint first.");
      return;
    }
    setInspecting(true);
    setError("");
    try {
      const services = createDBCServices(c.rpc, c.settings.commitment);
      const result = await services.state.inspectQuoteMint(quoteMint);
      setInspection(result);
      if (!result.exists) setError("Quote mint was not found on the selected RPC network.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Quote mint inspection failed.");
    } finally {
      setInspecting(false);
    }
  }

  async function prepareAttestation() {
    if (mode !== "Quantum" || !c.identity) {
      setError("A live in-memory QUANTEK Identity is required for a Quantum Launch attestation.");
      return;
    }
    if (!schemeInfo[scheme].live) {
      setError(schemeInfo[scheme].status + ". QUANTEK will not fabricate this signature.");
      return;
    }
    const ledger = createLeafLedger(c.identity.profile.address);
    const leaf = ledger.next();
    if (leaf === null) {
      setError("Identity leaf budget is exhausted.");
      return;
    }
    setAttesting(true);
    setError("");
    try {
      const proof = await signIdentityMessage(
        c.identity.secret,
        QUANTEK_LAUNCH_DOMAIN,
        JSON.stringify({ digest: launchDigest, payload: launchPayload }),
        leaf,
      );
      const checked = verifyIdentityProof(proof);
      if (!checked.valid) throw new Error("Prepared launch attestation failed local verification.");
      ledger.consume(leaf);
      setAttestation(proof);
      c.log("Quantum Launch attestation prepared locally", "Proof");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not prepare launch attestation.");
    } finally {
      setAttesting(false);
    }
  }

  function reviewPlan() {
    const issue = validate(6);
    if (issue) {
      setError(issue);
      return;
    }
    const firstBuyMethod =
      !draft.firstBuyEnabled
        ? "creator.createPool"
        : draft.firstBuyMode === "Partner + Creator"
          ? "creator.createPoolWithPartnerAndCreatorFirstBuy"
          : "creator.createPoolWithFirstBuy";

    c.setPlan({
      title: draft.symbol + " · " + mode + " DBC Launch Plan",
      steps: [
        "Re-validate token metadata and selected quote mint on " + c.network + ".",
        "Build the selected " + draft.builder + " curve and reusable PoolConfig with MET_DAMM_V2.",
        inspection?.tokenBadge === "resolve-before-live-construction"
          ? "Resolve Meteora DBC tokenBadge remaining-account requirement for the selected quote mint."
          : "Confirm quote mint requires no additional tokenBadge for the known quote path.",
        "Construct pool initialization with " + firstBuyMethod + ".",
        mode === "Quantum"
          ? attestation
            ? "Attach the locally verified QUANTEK Attestation Seal for leaf #" + attestation.leaf + "."
            : "Quantum mode selected: attestation must be prepared before any production metadata is finalized."
          : "Standard launch: no QUANTEK provenance attestation required.",
        "Prepare unsigned transactions, derive accounts/signers and fee estimate, then simulate exact reviewed bytes.",
        "Request wallet signatures only at explicit confirmation checkpoints.",
      ],
      accounts: [
        "Meteora DBC program " + DBC_PROGRAM_ID,
        quoteMint ? "Quote mint " + quoteMint : "Quote mint pending",
        "New base mint / pool accounts (derived at construction)",
        c.account ? "Creator wallet " + c.account.address : "Creator wallet not connected",
      ],
      fee: "RPC estimate required + account rent + configured pool fees",
      signatures: draft.firstBuyEnabled ? 2 : 2,
    });
    c.log(mode + " DBC launch review generated", "Launch", draft.symbol || "—");
  }

  const quoteName =
    draft.quoteClass === "Tokenized Market"
      ? selectedRwa?.symbol ?? (draft.customMint ? "Custom tokenized market" : "Not selected")
      : draft.cryptoQuote;

  const advanced = {
    ...launchPayload,
    digest: launchDigest,
    quoteInspection: inspection,
    firstBuy: {
      enabled: draft.firstBuyEnabled,
      mode: draft.firstBuyMode,
      creatorAmount: draft.creatorBuy,
      partnerAmount: draft.partnerBuy,
    },
    quantumAttestation: attestation
      ? {
          kind: attestation.kind,
          leaf: attestation.leaf,
          root: attestation.root,
          publicSeed: attestation.publicSeed,
        }
      : mode === "Quantum"
        ? { status: schemeInfo[scheme].status }
        : null,
    state: "simulation-draft",
  };

  return (
    <>
      <PageHeading
        eyebrow="PRIMARY MARKET / SOLANA / METEORA DBC"
        title="Launch"
        description="Build a Standard or Quantum launch on Meteora Dynamic Bonding Curve, choose a crypto or tokenized-market quote asset, and review every signing checkpoint."
      />

      <div className="launch-mode-switch mb-6">
        <div className="segmented" role="tablist" aria-label="Launch mode">
          {(["Standard", "Quantum"] as const).map((value) => (
            <Button
              key={value}
              variant="ghost"
              role="tab"
              aria-selected={mode === value}
              className={mode === value ? "selected" : ""}
              onClick={() => {
                setMode(value);
                setAttestation(null);
                setError("");
              }}
            >
              {value === "Quantum" && <Fingerprint size={13} />}
              {value} Launch
            </Button>
          ))}
        </div>
        <span className="status-tag">
          <span className="live-dot" />
          {mode === "Quantum" ? "ATTESTED DBC" : "STANDARD DBC"}
        </span>
      </div>

      {mode === "Quantum" && (
        <div className="notice mb-6">
          <ShieldCheck size={17} />
          <span>
            Quantum Launch adds a QUANTEK provenance attestation to the same Meteora DBC launch path.
            It does not replace the wallet signature required by Solana.{" "}
            {!c.identity && <Link to="/identity" className="underline">Derive a QUANTEK Identity first.</Link>}
          </span>
        </div>
      )}

      <div className="wizard-steps launch-steps">
        {steps.map((label, index) => (
          <Button
            key={label}
            variant="ghost"
            className={step === index ? "current" : ""}
            onClick={() => {
              if (index <= step || !validate(step)) {
                setStep(index);
                setError("");
              }
            }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {label}
          </Button>
        ))}
      </div>

      <div className="wizard-layout">
        <section className="instrument">
          <div className="wizard-form">
            <h2>{String(step + 1).padStart(2, "0")} / {steps[step]}</h2>

            {step === 0 && (
              <>
                <div className="form-grid">
                  <Field label="Token name"><input value={draft.name} maxLength={32} onChange={(event) => set("name", event.target.value)} /></Field>
                  <Field label="Ticker"><input value={draft.symbol} maxLength={10} onChange={(event) => set("symbol", event.target.value.toUpperCase())} /></Field>
                  <Field label="Image URI" hint="HTTPS or IPFS. Preview only until metadata is finalized."><input value={draft.image} onChange={(event) => set("image", event.target.value)} placeholder="https://… or ipfs://…" /></Field>
                  <Field label="Metadata URI"><input value={draft.metadata} onChange={(event) => set("metadata", event.target.value)} placeholder="https://… or ipfs://…" /></Field>
                  <Field label="X / Twitter"><input value={draft.twitter} onChange={(event) => set("twitter", event.target.value)} placeholder="@handle or URL" /></Field>
                  <Field label="Website"><input value={draft.website} onChange={(event) => set("website", event.target.value)} placeholder="https://…" /></Field>
                  <Field label="Base token decimals" hint="DBC base token restriction: 6–9."><input type="number" min={6} max={9} value={draft.decimals} onChange={(event) => set("decimals", event.target.valueAsNumber)} /></Field>
                  <Field label="Total supply"><input type="number" min={1} value={draft.supply} onChange={(event) => set("supply", event.target.valueAsNumber)} /></Field>
                  <Field label="Token program"><select value={draft.tokenType} onChange={(event) => set("tokenType", event.target.value as Draft["tokenType"])}><option>SPL Token</option><option>Token-2022</option></select></Field>
                </div>
                <div className="mt-5"><Field label="Description"><textarea value={draft.description} maxLength={1000} onChange={(event) => set("description", event.target.value)} placeholder="Describe the asset and launch." /></Field></div>
                {draft.image && urlOkay(draft.image) && <div className="launch-image-preview mt-5"><img src={draft.image} alt="Token image preview" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div>}
              </>
            )}

            {step === 1 && (
              <div className="strategy-layout">
                <div className="form-grid">
                  <Field label="Curve builder"><select value={draft.builder} onChange={(event) => set("builder", event.target.value as Draft["builder"])}>{["Market Cap", "Two Segments", "Liquidity Weights", "Custom"].map((value) => <option key={value}>{value}</option>)}</select></Field>
                  <Field label="Initial market cap (USD)"><input type="number" min={1} value={draft.initialCap} onChange={(event) => set("initialCap", event.target.valueAsNumber)} /></Field>
                  <Field label="Migration market cap (USD)"><input type="number" min={1} value={draft.migrationCap} onChange={(event) => set("migrationCap", event.target.valueAsNumber)} /></Field>
                  <Field label={"Migration quote threshold (" + quoteName + ")"}><input type="number" min={0} step="any" value={draft.quoteThreshold} onChange={(event) => set("quoteThreshold", event.target.valueAsNumber)} /></Field>
                  <Field label="Supply on migration (%)"><input type="number" min={1} max={100} value={draft.supplyMigration} onChange={(event) => set("supplyMigration", event.target.valueAsNumber)} /></Field>
                </div>
                <Panel title="Curve preview" tag={draft.builder.toUpperCase()}>
                  <div className="instrument-body">
                    <Sparkline points={curvePoints} />
                    <div className="notice mt-4">Illustrative geometry only. Production sqrt-price/curve points must come from the Meteora DBC SDK builder before signing.</div>
                  </div>
                </Panel>
              </div>
            )}

            {step === 2 && (
              <div className="form-grid">
                <Field label="Starting fee (bps)"><input type="number" min={0} max={10000} value={draft.startingBps} onChange={(event) => set("startingBps", event.target.valueAsNumber)} /></Field>
                <Field label="Ending fee (bps)"><input type="number" min={0} max={10000} value={draft.endingBps} onChange={(event) => set("endingBps", event.target.valueAsNumber)} /></Field>
                <Field label="Fee scheduler"><select value={draft.scheduler} onChange={(event) => set("scheduler", event.target.value as Draft["scheduler"])}><option>Linear</option><option>Exponential</option><option>Fixed</option></select></Field>
                <Field label="Collect-fee mode"><select value={draft.collectMode} onChange={(event) => set("collectMode", event.target.value as Draft["collectMode"])}><option>Quote token</option><option>Both tokens</option></select></Field>
                <Field label="Creator trading fee share (%)"><input type="number" min={0} max={100} value={draft.creatorFee} onChange={(event) => set("creatorFee", event.target.valueAsNumber)} /></Field>
                <Field label="Pool creation fee (SOL)"><input type="number" min={0} step="any" value={draft.creationFee} onChange={(event) => set("creationFee", event.target.valueAsNumber)} /></Field>
                <Field label="Migrated DAMM v2 fee"><select value={draft.migratedPoolFee} onChange={(event) => set("migratedPoolFee", event.target.value as Draft["migratedPoolFee"])}><option>Dynamic</option><option>Static 25 bps</option><option>Static 100 bps</option><option>Custom</option></select></Field>
                <div className="module-row"><div><strong>Dynamic DBC fee</strong><p>Use DBC dynamic fee behavior where supported by the selected configuration.</p></div><Switch checked={draft.dynamic} onCheckedChange={(value) => set("dynamic", value)} /></div>
              </div>
            )}

            {step === 3 && (
              <>
                <div className="form-grid">
                  <Field label="Migration target"><input readOnly value="MET_DAMM_V2 · DAMM v2" /></Field>
                  <Field label="Partner liquidity (%)"><input type="number" min={0} max={100} value={draft.partnerLiquidity} onChange={(event) => set("partnerLiquidity", event.target.valueAsNumber)} /></Field>
                  <Field label="Creator liquidity (%)"><input type="number" min={0} max={100} value={draft.creatorLiquidity} onChange={(event) => set("creatorLiquidity", event.target.valueAsNumber)} /></Field>
                  <Field label="Permanent lock (%)"><input type="number" min={0} max={100} value={draft.permanentLock} onChange={(event) => set("permanentLock", event.target.valueAsNumber)} /></Field>
                  <Field label="Vesting duration (days)"><input type="number" min={0} value={draft.vestingDays} onChange={(event) => set("vestingDays", event.target.valueAsNumber)} /></Field>
                  <Field label="Surplus / leftover receiver"><select value={draft.surplusReceiver} onChange={(event) => set("surplusReceiver", event.target.value as Draft["surplusReceiver"])}><option>Creator</option><option>Partner</option></select></Field>
                </div>
                <div className="notice mt-5"><TriangleAlert size={16}/>Permanent locks are irreversible after deployment. New QUANTEK launch plans target DAMM v2 only.</div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="segmented mb-5">
                  {(["Crypto", "Tokenized Market"] as const).map((value) => <Button key={value} variant="ghost" className={draft.quoteClass === value ? "selected" : ""} onClick={() => set("quoteClass", value)}>{value}</Button>)}
                </div>

                {draft.quoteClass === "Crypto" ? (
                  <div className="form-grid">
                    <Field label="Quote asset"><select value={draft.cryptoQuote} onChange={(event) => set("cryptoQuote", event.target.value as CryptoQuote)}><option>SOL</option><option>USDC</option><option>Custom Mint</option></select></Field>
                    {draft.cryptoQuote === "Custom Mint" && <Field label="Custom quote mint"><input value={draft.customMint} onChange={(event) => set("customMint", event.target.value.trim())} placeholder="Solana mint" /></Field>}
                  </div>
                ) : (
                  <>
                    <div className="search-field mb-4"><Search /><input value={rwaSearch} onChange={(event) => setRwaSearch(event.target.value)} placeholder="Search symbol, company or mint" aria-label="Search tokenized markets" /></div>
                    <div className="rwa-picker" role="listbox" aria-label="Tokenized market quote presets">
                      {filteredRwa.slice(0, 20).map((asset: TokenizedQuoteAsset) => (
                        <button
                          type="button"
                          role="option"
                          aria-selected={draft.tokenizedMint === asset.mint}
                          className={"rwa-row " + (draft.tokenizedMint === asset.mint ? "selected" : "")}
                          key={asset.mint}
                          onClick={() => {
                            set("tokenizedMint", asset.mint);
                            set("customMint", "");
                          }}
                        >
                          <span><strong>{asset.symbol}</strong><small>{asset.name} · {asset.kind}</small></span>
                          <span className="micro">{asset.mint.slice(0, 6)}…{asset.mint.slice(-5)}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-5"><Field label="Additional tokenized-market mint" hint="For current Ondo Global Markets or other Solana RWA mints: enter the live mint and verify it on the selected RPC."><input value={draft.customMint} onChange={(event) => { set("customMint", event.target.value.trim()); set("tokenizedMint", ""); }} placeholder="Current Solana tokenized-market mint" /></Field></div>
                    <div className="notice mt-5"><TriangleAlert size={16}/>Registry snapshot: 61 xStocks presets. Verify live on-chain before launch. Tokenized assets may have issuer, transfer, redemption, or jurisdiction restrictions; QUANTEK does not determine legal eligibility.</div>
                  </>
                )}

                <div className="quote-inspection mt-5">
                  <div className="detail-rows">
                    <div><span>Selected quote</span><strong>{quoteName}</strong></div>
                    <div><span>Mint</span><strong>{quoteMint || "Not selected"}</strong></div>
                    <div><span>Session verification</span><strong>{inspection ? (inspection.exists ? "Verified on RPC" : "Not found") : "Unverified in this session"}</strong></div>
                    <div><span>Decimals</span><strong>{inspection?.decimals ?? "Verify on RPC"}</strong></div>
                    <div><span>Token program</span><strong>{inspection?.tokenProgram ?? "Verify on RPC"}</strong></div>
                    <div><span>DBC tokenBadge</span><strong>{inspection?.tokenBadge === "not-required-known-quote" ? "Known quote · not required" : "Resolve before live construction"}</strong></div>
                  </div>
                  <Button variant="outline" onClick={inspectQuote} disabled={inspecting || !quoteMint}>
                    {inspecting ? <LoaderCircle className="animate-spin" /> : <Check />} Verify quote mint on {c.network}
                  </Button>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <div className="module-row">
                  <div><strong>First buy during pool initialization</strong><p>Uses Meteora DBC creator first-buy helpers when enabled.</p></div>
                  <Switch checked={draft.firstBuyEnabled} onCheckedChange={(value) => set("firstBuyEnabled", value)} />
                </div>
                {draft.firstBuyEnabled && (
                  <div className="form-grid mt-5">
                    <Field label="First-buy flow"><select value={draft.firstBuyMode} onChange={(event) => set("firstBuyMode", event.target.value as Draft["firstBuyMode"])}><option>Creator</option><option>Partner + Creator</option></select></Field>
                    <Field label={"Creator amount (" + quoteName + ")"}><input type="number" min={0} step="any" value={draft.creatorBuy} onChange={(event) => set("creatorBuy", event.target.valueAsNumber)} /></Field>
                    {draft.firstBuyMode === "Partner + Creator" && <Field label={"Partner amount (" + quoteName + ")"}><input type="number" min={0} step="any" value={draft.partnerBuy} onChange={(event) => set("partnerBuy", event.target.valueAsNumber)} /></Field>}
                  </div>
                )}
                <div className="notice mt-5">SDK route: {draft.firstBuyEnabled ? (draft.firstBuyMode === "Partner + Creator" ? "creator.createPoolWithPartnerAndCreatorFirstBuy" : "creator.createPoolWithFirstBuy") : "creator.createPool"}. Exact parameters, receiver accounts and quotes are derived only during live transaction construction.</div>
              </>
            )}

            {step === 6 && (
              <>
                {mode === "Quantum" && (
                  <Panel title="Attestation Seal" tag="QUANTUM LAUNCH" className="mb-5">
                    <div className="instrument-body">
                      <Field label="Signature scheme">
                        <select value={scheme} onChange={(event) => { setScheme(event.target.value as QuantumScheme); setAttestation(null); }}>
                          {(Object.keys(schemeInfo) as QuantumScheme[]).map((value) => <option key={value}>{value}</option>)}
                        </select>
                      </Field>
                      <div className="detail-rows mt-4">
                        <div><span>Scheme</span><strong>{schemeInfo[scheme].label}</strong></div>
                        <div><span>Status</span><strong>{schemeInfo[scheme].status}</strong></div>
                        <div><span>Identity</span><strong>{c.identity?.profile.address ?? "Not derived"}</strong></div>
                        <div><span>Identity root</span><strong>{c.identity ? c.identity.profile.root.slice(0, 16) + "…" : "—"}</strong></div>
                        <div><span>Launch digest</span><strong>{launchDigest.slice(0, 16)}…</strong></div>
                        <div><span>Leaf budget</span><strong>{c.identity ? (256 - createLeafLedger(c.identity.profile.address).used().length) + " remaining" : "—"}</strong></div>
                      </div>
                      <Button className="mt-5" onClick={prepareAttestation} disabled={attesting || !c.identity || !schemeInfo[scheme].live}>
                        {attesting ? <LoaderCircle className="animate-spin" /> : <Fingerprint />}
                        {schemeInfo[scheme].live ? "Prepare Attestation Seal locally" : "Implementation pending"}
                      </Button>
                      {attestation && <div className="notice mt-4"><ShieldCheck size={16}/>Attestation prepared and self-verified locally · leaf #{attestation.leaf}. This proof authenticates launch provenance; it does not authorize the Solana transaction.</div>}
                    </div>
                  </Panel>
                )}

                <div className="review-grid">
                  <div className="detail-rows">
                    <div><span>Launch mode</span><strong>{mode}</strong></div>
                    <div><span>Token</span><strong>{draft.name || "—"} · {draft.symbol || "—"}</strong></div>
                    <div><span>Curve</span><strong>{draft.builder}</strong></div>
                    <div><span>Quote market</span><strong>{quoteName}</strong></div>
                    <div><span>Quote mint</span><strong>{quoteMint || "—"}</strong></div>
                    <div><span>Quote verification</span><strong>{inspection?.exists ? "RPC verified" : "Not verified this session"}</strong></div>
                    <div><span>Migration</span><strong>DAMM v2</strong></div>
                    <div><span>DBC program</span><strong>{DBC_PROGRAM_ID.slice(0, 12)}…</strong></div>
                    <div><span>Unsigned transaction</span><strong>Not constructed</strong></div>
                    <div><span>Simulation</span><strong>Pending transaction construction</strong></div>
                    <div><span>Wallet signing</span><strong>Explicit review checkpoints only</strong></div>
                  </div>
                  <div className="notice mt-5"><ShieldCheck size={16}/>This review is an immutable planning summary. QUANTEK does not claim a config, pool, attestation anchor, or token was deployed until a real transaction is constructed, signed, submitted and confirmed.</div>
                  <Button className="mt-5" onClick={reviewPlan}><Rocket /> Open Execution Plan</Button>
                </div>
              </>
            )}

            {error && <div className="error-message mt-5" role="alert">{error}</div>}

            <div className="form-actions">
              <Button variant="outline" disabled={step === 0} onClick={() => { setStep((current) => Math.max(0, current - 1)); setError(""); }}><ArrowLeft />Back</Button>
              <span className="micro">{step + 1} OF {steps.length}</span>
              {step < steps.length - 1 ? <Button onClick={next}>Continue<ArrowRight /></Button> : <Button onClick={reviewPlan}><Rocket />Review execution plan</Button>}
            </div>

            <Button className="json-toggle mt-4" variant="ghost" onClick={() => setShowJson((value) => !value)}><Code2 />{showJson ? "Hide" : "Show"} advanced JSON draft</Button>
            {showJson && <pre className="code-block">{JSON.stringify(advanced, null, 2)}</pre>}
          </div>
        </section>

        <Panel title="Launch manifest" tag={mode.toUpperCase() + " / DRAFT"} className="wizard-summary">
          <div className="detail-rows">
            <div><span>Token</span><strong>{draft.symbol || "Not defined"}</strong></div>
            <div><span>Standard</span><strong>{draft.tokenType}</strong></div>
            <div><span>Builder</span><strong>{draft.builder}</strong></div>
            <div><span>Quote</span><strong>{quoteName}</strong></div>
            <div><span>Quote mint</span><strong>{quoteMint ? quoteMint.slice(0, 8) + "…" : "—"}</strong></div>
            <div><span>Migration</span><strong>DAMM v2</strong></div>
            <div><span>First buy</span><strong>{draft.firstBuyEnabled ? draft.firstBuyMode : "None"}</strong></div>
            <div><span>Network</span><strong>{c.network}</strong></div>
            <div><span>Wallet</span><strong>{c.account ? "Connected" : "Not connected"}</strong></div>
            {mode === "Quantum" && <><div><span>Quantum scheme</span><strong>{scheme}</strong></div><div><span>Attestation</span><strong>{attestation ? "Prepared · local" : "Not prepared"}</strong></div></>}
          </div>
          <div className="notice"><ExternalLink size={15}/>No wallet signature is requested while configuring this draft. Live transaction construction must resolve all SDK and quote-mint requirements first.</div>
        </Panel>
      </div>
    </>
  );
}
