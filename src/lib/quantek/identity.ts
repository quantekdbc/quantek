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

export type LeafLedger = {
  readonly capacity: 256;
  used(): readonly number[];
  isUsed(index: number): boolean;
  next(): number | null;
  consume(index: number): void;
  resetPublicLedger(): void;
};

const LEDGER_PREFIX = "quantek.identity.leaves.v1";

function assertLeaf(index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= QUANTEK_IDENTITY_PARAMETERS.leaves) {
    throw new Error("Identity leaf index must be between 0 and 255.");
  }
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
      for (let i = 0; i < QUANTEK_IDENTITY_PARAMETERS.leaves; i += 1) {
        if (!set.has(i)) return i;
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

export function buildIdentityAnchorMemo(address: string, root: string) {
  if (!address.startsWith("qtk1")) throw new Error("Expected a QUANTEK qtk1 identity address.");
  if (!/^[a-f0-9]{64}$/i.test(root)) throw new Error("Expected a 32-byte identity root.");
  return `quantek:v1:identity:${address}:${root.toLowerCase()}`;
}
