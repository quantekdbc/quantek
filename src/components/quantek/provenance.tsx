import {useState} from 'react';
import {z} from 'zod';
import {Fingerprint,ShieldCheck,TriangleAlert,Check,LoaderCircle,ScanLine,LockKeyhole,ArrowUpRight,Copy} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {PageHeading,Panel,Field,CopyValue} from './controls';
import {Geometry} from './geometry';
import {useConsole} from '@/lib/quantek/context';
import {makeDemoProof,verifyDemoProof,PQ_PARAMETERS} from '@/lib/quantek/pq';

const proofSchema = z.object({
  kind: z.literal('quantek-demo-wots-v1'),
  message: z.string().min(1).max(4096),
  leaf: z.number().int().min(0).max(255),
  publicSeed: z.string().regex(/^[0-9a-f]{64}$/i),
  signature: z.array(z.string().regex(/^[0-9a-f]{64}$/i)).length(67),
  authPath: z.array(z.string().regex(/^[0-9a-f]{64}$/i)).length(8),
  root: z.string().regex(/^[0-9a-f]{64}$/i)
});

export function IdentityPage() {
  const c = useConsole();
  const [pass, setPass] = useState('');
  const [hardening, setHardening] = useState(false);
  const [notice, setNotice] = useState('');
  const [root, setRoot] = useState('');
  const [seed, setSeed] = useState('');
  const [busy, setBusy] = useState(false);

  async function demo() {
    setBusy(true);
    try {
      const p = await makeDemoProof();
      setRoot(p.root);
      setSeed(p.publicSeed);
      c.log('Public demo identity loaded', 'Proof');
      setNotice('Public demonstration root only. Not wallet-derived, not registered, and not usable for signing.');
    } catch {
      setNotice('Browser cryptography unavailable.');
    } finally {
      setBusy(false);
    }
  }


  return (
    <>
      <PageHeading
        eyebrow="CRYPTOGRAPHIC IDENTITY / PROVENANCE"
        title="PQ Identity"
        description="A post-quantum provenance identity. One Merkle root. 256 one-time signature leaves."
      />
      <div className="identity-layout">
        <div>
          <Panel title="Identity manifest" tag="UNREGISTERED">
            <div className="instrument-body">
              <div className="identity-header">
                <Geometry compact />
                <div>
                  <strong>{root ? 'pq1…demo' : 'pq1…not derived'}</strong>
                  <p>{root ? 'PUBLIC DEMONSTRATION IDENTITY' : 'CONNECT WALLET TO BEGIN'}</p>
                </div>
              </div>
              <Field label="XMSS-style Merkle root">
                <div className="code-block">{root || 'Not derived · No private material generated'}</div>
              </Field>
              {root && <CopyValue value={root} />}
              <Field label="Public seed">
                <div className="code-block mt-3">{seed || 'Not derived'}</div>
              </Field>
              <div className="detail-rows mt-4">
                <div>
                  <span>Tree height / leaf count</span>
                  <strong>8 / 256</strong>
                </div>
                <div>
                  <span>Winternitz parameter</span>
                  <strong>WOTS w=16 · 67 chains</strong>
                </div>
                <div>
                  <span>Hash function</span>
                  <strong>SHA-256</strong>
                </div>
                <div>
                  <span>Anchor registration</span>
                  <strong>Not registered</strong>
                </div>
                <div>
                  <span>Solana memo</span>
                  <strong>No transaction</strong>
                </div>
              </div>
            </div>
          </Panel>
          <Panel title="Local derivation" tag="WALLET-CONTROLLED" className="mt-5">
            <div className="instrument-body">
              <Field label="Deterministic challenge · preview only"><div className="code-block">{`QUANTEK / ${c.settings.domain} / v${c.settings.version}\nWallet: ${c.account?.address??'not connected'}\nPurpose: provenance identity derivation; not a transaction.`}</div></Field>
              <p className="text-muted-foreground text-xs leading-7 mt-4">
                The pqc.market model derives an identity from a deterministic message signed locally by your wallet. This is not a transaction. Production-compatible derivation is not enabled in this preview.
              </p>
              <label className="checkbox-label">
                <input type="checkbox" checked={hardening} onChange={e => { setHardening(e.target.checked); if (!e.target.checked) setPass('') }} />
                Optional passphrase hardening
              </label>
              {hardening && (
                <Field label="Passphrase (preview only)" hint="Never submitted or persisted. This preview does not perform hardened derivation.">
                  <input type="password" autoComplete="off" maxLength={128} value={pass} onChange={e => setPass(e.target.value)} />
                </Field>
              )}
              <div className="flex flex-wrap gap-3 mt-5">
                <Button disabled title="Production-compatible derivation requires a reviewed protocol implementation">
                  {busy && <LoaderCircle className="animate-spin" />}
                  <Fingerprint />
                  Derive wallet identity · unavailable
                </Button>
                <Button variant="outline" onClick={demo} disabled={busy}>
                  {busy ? <LoaderCircle className="animate-spin" /> : <ScanLine />}
                  Load public demo
                </Button>
              </div>
              {notice && (
                <div className="notice mt-4" role="status">
                  {notice}
                </div>
              )}
              <div className="notice mt-5">
                <LockKeyhole size={16} />
                Passphrase input stays in browser memory. No signatures or secret keys are generated or stored by this preview.
              </div>
            </div>
          </Panel>
        </div>
        <div>
          <Panel title="Leaf budget" tag="DEMO">
            <div className="instrument-body">
              <div className="large-budget">214 <span>/ 256</span></div>
              <p className="micro">42 LEAVES USED / PUBLIC DEMO METRIC</p>
              <div className="progress-track mt-5">
                <progress value={42} max={256} />
              </div>
              <div className="detail-rows mt-4">
                <div>
                  <span>Next leaf (demo)</span>
                  <strong>#042</strong>
                </div>
                <div>
                  <span>Remaining capacity</span>
                  <strong>83.6%</strong>
                </div>
              </div>
              <div className="notice">
                <TriangleAlert size={16} />
                A WOTS leaf must never be reused. Production signing requires durable, synchronized leaf accounting across every device.
              </div>
            </div>
          </Panel>
          <Panel title="Security boundary" className="mt-5">
            <div className="instrument-body">
              <ShieldCheck size={27} className="mb-5" />
              <p className="text-xs leading-7 text-muted-foreground">
                PQ signatures can establish cryptographic provenance. They do <strong className="text-foreground">not</strong> make an ordinary Solana wallet quantum-secure.
              </p>
              <p className="text-xs leading-7 text-muted-foreground mt-4">
                Solana still uses ed25519. Protection of funds requires a dedicated, verified on-chain PQ vault; QUANTEK does not provide one here.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

export function VerifyPage() {
  const c = useConsole();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('Attestation');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<{ valid: boolean; root: string; digest: string } | null>(null);
  const [error, setError] = useState('');
  const [pendingExample, setPendingExample] = useState(false);

  async function example(invalid = false) {
    setPendingExample(true);
    setError('');
    setResult(null);
    setStage(0);
    try {
      const proof = await makeDemoProof();
      if (invalid) proof.message += ' / tampered';
      setInput(JSON.stringify(proof, null, 2));
      setMode('Attestation');
    } catch {
      setError('Browser cryptography unavailable.');
    } finally {
      setPendingExample(false);
    }
  }

  async function verify() {
    setError('');
    setResult(null);
    setStage(0);
    if (mode !== 'Attestation') {
      setError('Remote mint and metadata resolution is not connected. Paste a QUANTEK public demo attestation to test the local verification pipeline.');
      return;
    }
    setBusy(true);
    try {
      if (input.length > 25000) throw new Error('Attestation must be under 25 KB.');
      const proof = proofSchema.parse(JSON.parse(input));
      setStage(2);
      const r = await verifyDemoProof(proof);
      setStage(r.valid ? 6 : 4);
      setResult(r);
      c.log(`Demo provenance verification ${r.valid ? 'valid' : 'invalid'}`, 'Proof');
    } catch (e) {
      setError(e instanceof z.ZodError ? 'Invalid attestation schema. Expected 67 WOTS chains and 8 Merkle siblings.' : e instanceof Error ? e.message : 'Verification failed.');
    } finally {
      setBusy(false);
    }
  }

  const names = ['Attestation parsed', 'Digest recomputed', 'WOTS chains reconstructed', 'Merkle auth path', 'Root match', 'Provenance result'];

  return (
    <>
      <PageHeading
        eyebrow="TRUST / INDEPENDENT VERIFICATION"
        title="Verify Provenance"
        description="Recompute the digest, verify one-time signature chains and compare the Merkle root."
      />
      <Panel title="Verification input" tag="LOCAL CRYPTOGRAPHY">
        <div className="instrument-body">
          <div className="segmented mb-5">
            {['Mint address', 'Metadata URI', 'Attestation'].map(v => (
              <Button key={v} variant="ghost" className={mode === v ? 'selected' : ''} aria-pressed={mode === v} disabled={busy || pendingExample} onClick={() => {setMode(v);setInput('');setError('');setResult(null);setStage(0)}}>{v}</Button>
            ))}
          </div>
          <Field label={mode}>
            <textarea
              value={input}
              disabled={busy || pendingExample}
              maxLength={25000}
              onChange={e => { setInput(e.target.value); setError(''); setResult(null); setStage(0) }}
              placeholder={mode === 'Attestation' ? 'Paste a QUANTEK demo attestation JSON…' : mode === 'Mint address' ? 'Solana mint address…' : 'https://… / ipfs://…'}
            />
          </Field>
          <div className="form-actions">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => example()} disabled={pendingExample || busy}>Valid demo</Button>
              <Button variant="outline" size="sm" onClick={() => example(true)} disabled={pendingExample || busy}>Invalid demo</Button>
            </div>
            <Button onClick={verify} disabled={busy || pendingExample || !input.trim()}>
              {busy ? <LoaderCircle className="animate-spin" /> : <ScanLine />}
              Verify proof
              <ArrowUpRight />
            </Button>
          </div>
          {error && <div className="error-message" role="alert">{error}</div>}
        </div>
      </Panel>
      <div className="verification-pipeline">
        {names.map((name, i) => (
          <div key={name} className={`pipeline-step ${i < stage ? 'passed' : ''}`}>
            {result && !result.valid && i >= 4 ? <TriangleAlert /> : busy && i === stage ? <LoaderCircle className="animate-spin" /> : i < stage ? <Check /> : <span className="block mb-3 font-mono">0{i + 1}</span>}
            <div>{name}</div>
          </div>
        ))}
      </div>
      {result && (
        <>
          <div className="result-banner" role="status">
            {result.valid ? <ShieldCheck size={28} /> : <TriangleAlert size={28} />}
            <div>
              <h3>{result.valid ? 'Valid public demo proof' : 'Invalid proof · Root mismatch'}</h3>
              <p>{result.valid ? 'Chains and authentication path match the supplied root. This does not establish a trusted identity or verify a real launch.' : 'The recomputed root differs from the claimed root. Do not trust this attestation.'}</p>
            </div>
          </div>
          <div className="form-grid mt-6">
            <Panel title="Computed Merkle root">
              <div className="instrument-body">
                <div className="code-block">{result.root}</div>
                <CopyValue value={result.root} />
              </div>
            </Panel>
            <Panel title="Message digest">
              <div className="instrument-body">
                <div className="code-block">{result.digest}</div>
              </div>
            </Panel>
          </div>
        </>
      )}
      <div className="notice mt-6">
        <Fingerprint size={17} />
        Public demo siblings illustrate an authentication path, not a wallet-derived 256-leaf signing tree. This verifier uses an isolated QUANTEK demo encoding: WOTS w=16, SHA-256, 67 chains, height 8. It is not a production pqc.market-compatible parser. A root match alone is not a trusted anchor.
      </div>
    </>
  );
}