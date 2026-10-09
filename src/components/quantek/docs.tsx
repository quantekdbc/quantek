import { useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading, Panel } from "./controls";

type DocSection = { id: string; title: string; kicker: string; body: string[]; code?: string };

const sections: readonly DocSection[] = [
  { id: "overview", title: "Overview", kicker: "PROTOCOL MAP", body: [
    "QUANTEK combines a Solana-native Meteora DBC operations console with hash-based identity and provenance. Standard Launch and Quantum Launch share the same DBC execution path; Quantum Launch adds an independently verifiable attestation layer.",
    "The platform is non-custodial. Wallet signing remains client-controlled, and a proof of provenance is never presented as a replacement for Solana transaction authorization.",
  ]},
  { id: "threat", title: "Threat Model", kicker: "ASSUMPTIONS", body: [
    "QUANTEK treats RPC mismatch, transaction mutation, stale blockhashes, malformed proofs, WOTS leaf reuse, and misleading demo/live state as security failures.",
    "A compromised operating system, malicious wallet extension, Solana consensus failure, or third-party protocol vulnerability remains outside what a browser application can fully defend against.",
  ]},
  { id: "primitives", title: "Cryptographic Primitives", kicker: "SHA-256 ROOT", body: [
    "The root identity model uses SHA-256, WOTS with w=16, 67 chains, and an XMSS-style height-8 Merkle tree. Public identity material is the root plus public seed.",
    "QUANTEK uses its own domain-separated namespaces so signatures cannot be replayed as another protocol's messages.",
  ], code: "quantek.network/identity/v1\nquantek.network/launch/v1\nquantek.network/proof/v1\nquantek.network/quantum-wallet/v1"},
  { id: "wots", title: "WOTS-16", kicker: "ONE-TIME SIGNATURE", body: [
    "A 32-byte digest becomes 64 base-16 message digits plus three checksum digits, producing 67 WOTS chains. A full Merkle-authenticated identity signature is 2,404 bytes.",
    "Every WOTS leaf is one-time. Once a leaf is consumed, clients must refuse to sign with it again.",
  ], code: "w = 16\nchains = 67\nchain steps = 15\nsignature = 2,404 bytes"},
  { id: "identity", title: "Merkle Identity", kicker: "QTK1 ADDRESS", body: [
    "A QUANTEK identity is represented by a qtk1 address, Merkle root, public seed, and a 256-leaf budget. The address belongs to the QUANTEK namespace rather than an external identity format.",
    "The tree can support provenance attestations, registration proofs, and challenge-response ownership proofs.",
  ]},
  { id: "derive", title: "Derivation & Hardening", kicker: "LOCAL ONLY", body: [
    "The intended derivation starts from a deterministic wallet message signature. An optional passphrase is hardened with scrypt before HKDF-SHA256 seed expansion.",
    "Raw identity seeds and passphrases must remain in browser memory. Public metadata and consumed leaf indexes may be persisted separately.",
  ], code: "scrypt: N = 2^15, r = 8, p = 1\nKDF: HKDF-SHA256"},
  { id: "registration", title: "Registration", kicker: "GENESIS BINDING", body: [
    "Registration binds the connected Solana wallet to the qtk address, root, and public seed. The model reserves leaf 0 for the genesis binding.",
    "Until QUANTEK operates a synchronized public identity ledger, the browser experience is explicitly a Local Registration Profile rather than a global registration claim.",
  ]},
  { id: "anchor", title: "Solana Anchor", kicker: "PUBLIC TIMESTAMP", body: [
    "An identity root can be timestamped through an SPL Memo signed by the connected wallet. QUANTEK prepares the memo through the same review and signing boundary as other transactions.",
    "The UI must not say an anchor exists until the transaction is actually confirmed.",
  ], code: "quantek:v1:identity:<qtk-address>:<root>"},
  { id: "standard-launch", title: "Standard Launch", kicker: "METEORA DBC", body: [
    "Standard Launch configures the token, curve, fees, DAMM v2 migration, quote market, optional first buy, and immutable transaction review without requiring a post-quantum attestation.",
    "All live construction remains subject to active-RPC account validation and wallet-controlled signing.",
  ]},
  { id: "quantum-launch", title: "Quantum Launch", kicker: "ATTESTATION SEAL", body: [
    "Quantum Launch uses the same Meteora DBC launch path and adds a QUANTEK Identity attestation over the launch identity. The review surface exposes the qtk identity, root, selected scheme, leaf budget, digest, and metadata proof envelope.",
    "Schemes that are not wired to production key generation and verification remain visibly marked as pending rather than simulated as valid.",
  ]},
  { id: "schemes", title: "Signature Schemes", kicker: "ROOT + CERTIFIED KEYS", body: [
    "The WOTS/Merkle identity is the root of trust. ML-DSA-65 and SLH-DSA-SHA2-128s can be represented as many-time keys certified once by a WOTS leaf when the production implementation is complete.",
    "FN-DSA/Falcon and hybrid modes must be labeled experimental until their QUANTEK integration and standardization status justify stronger claims.",
  ]},
  { id: "proof", title: "Proof of Possession", kicker: "CHALLENGE / RESPONSE", body: [
    "A challenge proof signs a fresh nonce-bound digest with the next unused identity leaf. Verification recomputes the WOTS public endpoints and Merkle path back to the registered root.",
    "Nonce expiry and one-time leaf consumption are separate replay defenses.",
  ]},
  { id: "wallets", title: "Quantum Wallets", kicker: "ON-CHAIN VERIFIER REQUIRED", body: [
    "Quantum Wallets are a dedicated custody design, not a rebrand of a browser wallet. A live implementation requires a Solana program that directly verifies the hash-signature authority controlling a vault.",
    "QUANTEK currently exposes readiness and proof UX only. Live deposits and withdrawals remain disabled until QUANTEK deploys and audits its own verifier program.",
  ]},
  { id: "dbc", title: "Meteora DBC", kicker: "DAMM V2", body: [
    "QUANTEK uses Meteora Dynamic Bonding Curve as the launch primitive. New configs target DAMM v2, expose partner/creator fee flows, and can use configurable quote mints.",
    "Modern DBC SDK releases support arbitrary quote decimals. Quote mints outside permissionless-supported sets may require a token-badge remaining account.",
  ], code: "program: dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN\nmigration: MET_DAMM_V2"},
  { id: "rwa", title: "Tokenized Market Quotes", kicker: "SOLANA RWA", body: [
    "The launch quote selector includes a 61-mint Solana xStocks discovery snapshot plus a validated custom-mint path for current tokenized-market assets from other issuers.",
    "Every selected mint must be re-validated on the active RPC before live construction. Issuer and jurisdiction restrictions remain external eligibility constraints.",
  ]},
  { id: "review", title: "Transaction Review Model", kicker: "BYTE INTEGRITY", body: [
    "QUANTEK freezes the serialized message shown for review, verifies RPC network identity and blockhash validity, simulates the exact reviewed transaction, and checks that wallet-returned signed bytes contain the same message.",
    "Submission is a separate operation. A signing helper must never silently broadcast.",
  ]},
  { id: "boundaries", title: "Security Boundaries", kicker: "NO FALSE CLAIMS", body: [
    "Quantum provenance authenticates launch or identity claims. It does not make ordinary ed25519-controlled funds quantum-safe.",
    "Demo data, local proof examples, and protocol-readiness views are labeled as such. No view may fabricate mainnet success.",
  ]},
  { id: "parameters", title: "Parameters", kicker: "REFERENCE V1", body: [
    "The v1 identity reference uses SHA-256, WOTS w=16, 67 chains, Merkle height 8, and 256 leaves. The local passphrase-hardening target is scrypt N=2^15, r=8, p=1.",
    "Concrete production serialization and test vectors must be frozen before a live attestation format is considered stable.",
  ]},
  { id: "verify", title: "Verification Examples", kicker: "PROOF TRACE", body: [
    "A WOTS trace parses public proof material, recomputes the launch or challenge digest, finishes 67 WOTS chains, compresses the leaf, climbs eight Merkle levels, and compares the computed root.",
    "Scheme-certified keys first verify the WOTS certificate against the identity root, then verify the many-time signature using the certified public key.",
  ]},
];

export function DocsPage() {
  const [active, setActive] = useState("overview");
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((section) => [section.title, section.kicker, ...section.body].join(" ").toLowerCase().includes(q));
  }, [query]);
  const section = sections.find((item) => item.id === active) ?? visible[0] ?? sections[0];

  return (
    <>
      <PageHeading
        eyebrow="QUANTEK / TECHNICAL REFERENCE"
        title="Docs"
        description="Protocol architecture, launch mechanics, identity, Quantum Wallets, Meteora DBC, and security boundaries in QUANTEK's own namespace."
        action={<Button asChild variant="outline"><a href="https://github.com/quantekdbc/quantek/tree/main/docs" target="_blank" rel="noreferrer">Repository docs <ArrowUpRight /></a></Button>}
      />
      <div className="strategy-layout">
        <aside>
          <Panel title="Documentation index" tag={String(visible.length) + " SECTIONS"}>
            <div className="instrument-body">
              <div className="search-field mb-4"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documentation" aria-label="Search QUANTEK documentation" /></div>
              <nav className="command-list" aria-label="Documentation sections">
                {visible.map((item) => <button key={item.id} type="button" className={"text-left " + (active === item.id ? "bg-secondary" : "")} onClick={() => setActive(item.id)}><span>{item.title}</span></button>)}
              </nav>
            </div>
          </Panel>
        </aside>
        <article>
          <Panel title={section?.title ?? "Docs"} tag={section?.kicker}>
            <div className="instrument-body">
              <BookOpen size={24} className="mb-5" />
              {section?.body.map((paragraph) => <p key={paragraph} className="text-sm leading-8 text-muted-foreground mb-5">{paragraph}</p>)}
              {section?.code && <pre className="code-block">{section.code}</pre>}
              {section?.id === "boundaries" && <div className="notice mt-5"><ShieldCheck size={16}/>Security claims in QUANTEK should remain narrower than the code actually implements.</div>}
            </div>
          </Panel>
        </article>
      </div>
    </>
  );
}
