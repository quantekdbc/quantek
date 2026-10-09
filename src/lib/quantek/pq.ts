// Browser-only cryptography is invoked from event handlers, never module scope.
export const PQ_PARAMETERS = { w: 16, hash: 'SHA-256', height: 8, leaves: 256, chains: 67 };

export async function sha256(bytes: Uint8Array) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)));
}

export function hex(bytes: Uint8Array) {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(s: string) {
  if (!/^[a-f0-9]{64}$/i.test(s)) throw new Error('Expected a 32-byte hexadecimal value.');
  return new Uint8Array(s.match(/.{2}/g)?.map(x => parseInt(x, 16)) ?? []);
}

function concat(...arrays: Uint8Array[]) {
  const out = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

export type DemoProof = {
  kind: 'quantek-demo-wots-v1';
  message: string;
  leaf: number;
  publicSeed: string;
  signature: string[];
  authPath: string[];
  root: string;
};

function digits(digest: Uint8Array) {
  const values = Array.from(digest).flatMap(b => [b >> 4, b & 15]);
  let checksum = values.reduce((s, v) => s + 15 - v, 0);
  const suffix = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    suffix[i] = checksum % 16;
    checksum = Math.floor(checksum / 16);
  }
  return [...values, ...suffix];
}

async function chain(value: Uint8Array, seed: Uint8Array, index: number, start: number, end: number, leaf: number) {
  let current = value;
  for (let j = start; j < end; j++) {
    current = await sha256(concat(seed, new Uint8Array([leaf, index, j]), current));
  }
  return current;
}

export async function makeDemoProof(): Promise<DemoProof> {
  const message = 'QUANTEK / public demonstration / not a real launch attestation';
  const publicSeed = await sha256(new TextEncoder().encode('QUANTEK public demo seed'));
  const digest = await sha256(new TextEncoder().encode(message));
  const values = digits(digest);
  const signature: string[] = [];
  const publicKeys: Uint8Array[] = [];
  for (let i = 0; i < 67; i++) {
    const secret = await sha256(new TextEncoder().encode(`PUBLIC-DEMO-ONLY-${i}`));
    signature.push(hex(await chain(secret, publicSeed, i, 0, values[i] ?? 0, 42)));
    publicKeys.push(await chain(secret, publicSeed, i, 0, 15, 42));
  }
  let root = await sha256(concat(...publicKeys));
  const authPath: string[] = [];
  for (let level = 0; level < 8; level++) {
    const sibling = await sha256(new TextEncoder().encode(`PUBLIC-DEMO-SIBLING-${level}`));
    authPath.push(hex(sibling));
    root = await sha256((42 >> level) & 1 ? concat(sibling, root) : concat(root, sibling));
  }
  return { kind: 'quantek-demo-wots-v1', message, leaf: 42, publicSeed: hex(publicSeed), signature, authPath, root: hex(root) };
}

export async function verifyDemoProof(proof: DemoProof) {
  if(proof.kind!=='quantek-demo-wots-v1'||!Number.isInteger(proof.leaf)||proof.leaf<0||proof.leaf>=PQ_PARAMETERS.leaves||proof.signature.length!==PQ_PARAMETERS.chains||proof.authPath.length!==PQ_PARAMETERS.height||!proof.message||proof.message.length>4096)throw new Error('Invalid public demo proof parameters.');
  fromHex(proof.root);
  const digest = await sha256(new TextEncoder().encode(proof.message));
  const values = digits(digest);
  const seed = fromHex(proof.publicSeed);
  const publicKeys: Uint8Array[] = [];
  for (let i = 0; i < 67; i++) {
    publicKeys.push(await chain(fromHex(proof.signature[i] ?? ''), seed, i, values[i] ?? 0, 15, proof.leaf));
  }
  let root = await sha256(concat(...publicKeys));
  for (let level = 0; level < 8; level++) {
    const sibling = fromHex(proof.authPath[level] ?? '');
    root = await sha256((proof.leaf >> level) & 1 ? concat(sibling, root) : concat(root, sibling));
  }
  return { valid: hex(root) === proof.root.toLowerCase(), root: hex(root), digest: hex(digest) };
}