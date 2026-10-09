import { hkdf } from "@noble/hashes/hkdf";
import { scrypt } from "@noble/hashes/scrypt";
import { sha256 } from "@noble/hashes/sha256";
import { concatBytes, utf8ToBytes } from "@noble/hashes/utils";

export const QUANTEK_IDENTITY_DOMAIN = "quantek.network/identity/v1";
export const QUANTEK_LAUNCH_DOMAIN = "quantek.network/launch/v1";
export const QUANTEK_PROOF_DOMAIN = "quantek.network/proof/v1";

export const QUANTEK_IDENTITY_PARAMETERS = {
  hash: "SHA-256",
  wotsW: 16,
  chains: 67,
  merkleHeight: 8,
  leaves: 256,
  signatureBytes: 2404,
} as const;

export type PublicIdentityProfile = {
  address: `qtk1${string}`;
  root: string;
  publicSeed: string;
  wallet: string;
  createdAt: string;
  anchorSignature?: string;
};

export type IdentitySecretState = {
  skSeed: Uint8Array;
  publicSeed: Uint8Array;
  levels: Uint8Array[][];
};

export type DerivedIdentity = {
  profile: PublicIdentityProfile;
  secret: IdentitySecretState;
};

export type IdentityProof = {
  kind: "quantek-wots-merkle-v1";
  domain: string;
  message: string;
  leaf: number;
  publicSeed: string;
  root: string;
  signature: string[];
  authPath: string[];
};

export type LeafLedger = {
  readonly capacity: 256;
  used(): readonly number[];
  isUsed(index: number): boolean;
  next(): number | null;
  consume(index: number): void;
  resetPublicLedger(): void;
};

const LEDGER_PREFIX = "quantek.identity.leaves.v1";

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string) {
  if (!/^[a-f0-9]+$/i.test(value) || value.length % 2 !== 0) throw new Error("Invalid hexadecimal value.");
  return new Uint8Array(value.match(/.{2}/g)?.map((part) => Number.parseInt(part, 16)) ?? []);
}

function u32be(value: number) {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value >>> 0, false);
  return out;
}

function address(type: number, a: number, b = 0, c = 0) {
  return concatBytes(u32be(type), u32be(a), u32be(b), u32be(c), new Uint8Array(16));
}

function tweak(publicSeed: Uint8Array, adrs: Uint8Array, value: Uint8Array) {
  return sha256(concatBytes(publicSeed, adrs, value));
}

function wotsSecret(skSeed: Uint8Array, leaf: number, chainIndex: number) {
  return sha256(concatBytes(skSeed, address(3, leaf, chainIndex, 0)));
}

function walkChain(
  start: Uint8Array,
  publicSeed: Uint8Array,
  leaf: number,
  chainIndex: number,
  from: number,
  to: number,
) {
  let value = new Uint8Array(start);
  for (let step = from; step < to; step += 1) {
    value = tweak(publicSeed, address(0, leaf, chainIndex, step), value);
  }
  return value;
}

function digestDigits(digest: Uint8Array) {
  const digits = Array.from(digest).flatMap((value) => [value >> 4, value & 15]);
  let checksum = digits.reduce((total, value) => total + 15 - value, 0);
  const suffix = [0, 0, 0];
  for (let index = suffix.length - 1; index >= 0; index -= 1) {
    suffix[index] = checksum % 16;
    checksum = Math.floor(checksum / 16);
  }
  return [...digits, ...suffix];
}

function wotsLeaf(skSeed: Uint8Array, publicSeed: Uint8Array, leaf: number) {
  const ends: Uint8Array[] = [];
  for (let chainIndex = 0; chainIndex < QUANTEK_IDENTITY_PARAMETERS.chains; chainIndex += 1) {
    const secret = wotsSecret(skSeed, leaf, chainIndex);
    ends.push(walkChain(secret, publicSeed, leaf, chainIndex, 0, 15));
  }
  return sha256(concatBytes(publicSeed, address(1, leaf), ...ends));
}

function merkleParent(publicSeed: Uint8Array, level: number, index: number, left: Uint8Array, right: Uint8Array) {
  return sha256(concatBytes(publicSeed, address(2, level, index), left, right));
}

function assertLeaf(index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= QUANTEK_IDENTITY_PARAMETERS.leaves) {
    throw new Error("Identity leaf index must be between 0 and 255.");
  }
}

export function buildIdentityDerivationMessage(wallet: string) {
  return [
    "QUANTEK — Quantum Identity Derivation v1",
    "",
    "This signature derives local hash-based identity material for QUANTEK.",
    "It is not a Solana transaction.",
    "Never sign this exact derivation statement on an untrusted site.",
    "",
    `Wallet: ${wallet}`,
    `Domain: ${QUANTEK_IDENTITY_DOMAIN}`,
    "Version: 1",
  ].join("\n");
}

export async function deriveIdentityFromWalletSignature(
  wallet: string,
  signature: Uint8Array,
  passphrase = "",
  onProgress?: (fraction: number) => void,
): Promise<DerivedIdentity> {
  if (signature.length < 32) throw new Error("Wallet derivation signature is missing or malformed.");

  const passMaterial = passphrase
    ? scrypt(
        utf8ToBytes(passphrase),
        sha256(utf8ToBytes("quantek.identity.passphrase.v1:" + wallet)),
        { N: 2 ** 15, r: 8, p: 1, dkLen: 32 },
      )
    : new Uint8Array(32);

  const ikm = sha256(concatBytes(signature, passMaterial));
  const seedMaterial = hkdf(
    sha256,
    ikm,
    new Uint8Array(0),
    utf8ToBytes(QUANTEK_IDENTITY_DOMAIN + "/seed"),
    64,
  );
  const skSeed = seedMaterial.slice(0, 32);
  const publicSeed = seedMaterial.slice(32, 64);

  const leaves: Uint8Array[] = [];
  for (let leaf = 0; leaf < QUANTEK_IDENTITY_PARAMETERS.leaves; leaf += 1) {
    leaves.push(wotsLeaf(skSeed, publicSeed, leaf));
    if (leaf % 8 === 7) {
      onProgress?.((leaf + 1) / QUANTEK_IDENTITY_PARAMETERS.leaves * 0.9);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  const levels: Uint8Array[][] = [leaves];
  for (let level = 1; level <= QUANTEK_IDENTITY_PARAMETERS.merkleHeight; level += 1) {
    const prior = levels[level - 1] ?? [];
    const next: Uint8Array[] = [];
    for (let index = 0; index < prior.length; index += 2) {
      const left = prior[index];
      const right = prior[index + 1];
      if (!left || !right) throw new Error("Merkle tree construction failed.");
      next.push(merkleParent(publicSeed, level, index / 2, left, right));
    }
    levels.push(next);
  }

  const root = levels.at(-1)?.[0];
  if (!root) throw new Error("Identity root generation failed.");
  const addressDigest = sha256(
    concatBytes(utf8ToBytes("quantek.address/v1"), publicSeed, root),
  );
  const addressText = ("qtk1" + hex(addressDigest.slice(0, 20))) as `qtk1${string}`;
  onProgress?.(1);

  return {
    profile: {
      address: addressText,
      root: hex(root),
      publicSeed: hex(publicSeed),
      wallet,
      createdAt: new Date().toISOString(),
    },
    secret: { skSeed, publicSeed, levels },
  };
}

export function createLeafLedger(identityAddress: string): LeafLedger {
  const key = `${LEDGER_PREFIX}:${identityAddress}`;

  const read = () => {
    if (typeof localStorage === "undefined") return [] as number[];
    try {
      const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (!Array.isArray(parsed)) return [];
      return [...new Set(parsed.filter((value) => Number.isInteger(value) && value >= 0 && value < 256))].sort(
        (a, b) => a - b,
      );
    } catch {
      return [];
    }
  };

  const write = (values: readonly number[]) => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, JSON.stringify(values));
  };

  return {
    capacity: 256,
    used: () => read(),
    isUsed: (index) => {
      assertLeaf(index);
      return read().includes(index);
    },
    next: () => {
      const set = new Set(read());
      for (let index = 0; index < QUANTEK_IDENTITY_PARAMETERS.leaves; index += 1) {
        if (!set.has(index)) return index;
      }
      return null;
    },
    consume: (index) => {
      assertLeaf(index);
      const current = read();
      if (current.includes(index)) {
        throw new Error(`Identity leaf #${index} has already been consumed and cannot be reused.`);
      }
      write([...current, index].sort((a, b) => a - b));
    },
    resetPublicLedger: () => {
      if (typeof localStorage !== "undefined") localStorage.removeItem(key);
    },
  };
}

export async function signIdentityMessage(
  state: IdentitySecretState,
  domain: string,
  message: string,
  leaf: number,
): Promise<IdentityProof> {
  assertLeaf(leaf);
  if (!domain.startsWith("quantek.")) throw new Error("Identity proof domain must belong to QUANTEK.");

  const digest = sha256(concatBytes(utf8ToBytes(domain + "\n"), utf8ToBytes(message)));
  const digits = digestDigits(digest);
  const signature: string[] = [];

  for (let chainIndex = 0; chainIndex < QUANTEK_IDENTITY_PARAMETERS.chains; chainIndex += 1) {
    const secret = wotsSecret(state.skSeed, leaf, chainIndex);
    signature.push(hex(walkChain(secret, state.publicSeed, leaf, chainIndex, 0, digits[chainIndex] ?? 0)));
  }

  const authPath: string[] = [];
  let nodeIndex = leaf;
  for (let level = 0; level < QUANTEK_IDENTITY_PARAMETERS.merkleHeight; level += 1) {
    const sibling = state.levels[level]?.[nodeIndex ^ 1];
    if (!sibling) throw new Error("Identity authentication path is incomplete.");
    authPath.push(hex(sibling));
    nodeIndex = Math.floor(nodeIndex / 2);
  }

  const root = state.levels.at(-1)?.[0];
  if (!root) throw new Error("Identity root unavailable.");

  return {
    kind: "quantek-wots-merkle-v1",
    domain,
    message,
    leaf,
    publicSeed: hex(state.publicSeed),
    root: hex(root),
    signature,
    authPath,
  };
}

export function verifyIdentityProof(proof: IdentityProof) {
  assertLeaf(proof.leaf);
  if (proof.signature.length !== 67 || proof.authPath.length !== 8) {
    throw new Error("Identity proof dimensions are invalid.");
  }
  if (!proof.domain.startsWith("quantek.")) throw new Error("Identity proof domain is invalid.");

  const publicSeed = fromHex(proof.publicSeed);
  if (publicSeed.length !== 32) throw new Error("Public seed must be 32 bytes.");
  const digest = sha256(concatBytes(utf8ToBytes(proof.domain + "\n"), utf8ToBytes(proof.message)));
  const digits = digestDigits(digest);
  const ends: Uint8Array[] = [];

  for (let chainIndex = 0; chainIndex < 67; chainIndex += 1) {
    const start = fromHex(proof.signature[chainIndex] ?? "");
    if (start.length !== 32) throw new Error("WOTS chain value must be 32 bytes.");
    ends.push(walkChain(start, publicSeed, proof.leaf, chainIndex, digits[chainIndex] ?? 0, 15));
  }

  let node = sha256(concatBytes(publicSeed, address(1, proof.leaf), ...ends));
  let nodeIndex = proof.leaf;
  for (let level = 0; level < 8; level += 1) {
    const sibling = fromHex(proof.authPath[level] ?? "");
    if (sibling.length !== 32) throw new Error("Merkle sibling must be 32 bytes.");
    const parentIndex = Math.floor(nodeIndex / 2);
    node =
      nodeIndex % 2 === 0
        ? merkleParent(publicSeed, level + 1, parentIndex, node, sibling)
        : merkleParent(publicSeed, level + 1, parentIndex, sibling, node);
    nodeIndex = parentIndex;
  }

  const computedRoot = hex(node);
  return {
    valid: computedRoot === proof.root.toLowerCase(),
    computedRoot,
    digest: hex(digest),
  };
}

export function buildIdentityAnchorMemo(addressText: string, root: string) {
  if (!addressText.startsWith("qtk1")) throw new Error("Expected a QUANTEK qtk1 identity address.");
  if (!/^[a-f0-9]{64}$/i.test(root)) throw new Error("Expected a 32-byte identity root.");
  return `quantek:v1:identity:${addressText}:${root.toLowerCase()}`;
}
