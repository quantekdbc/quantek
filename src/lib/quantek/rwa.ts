import { PublicKey } from "@solana/web3.js";

export type RwaAssetKind = "equity" | "etf" | "commodity-etf";

export type TokenizedQuoteAsset = {
  symbol: string;
  name: string;
  mint: string;
  issuer: "xStocks / Backed";
  kind: RwaAssetKind;
  snapshotDate: "2025-07-06";
};

const X = (symbol: string, name: string, mint: string, kind: RwaAssetKind = "equity"): TokenizedQuoteAsset => ({
  symbol,
  name,
  mint,
  issuer: "xStocks / Backed",
  kind,
  snapshotDate: "2025-07-06",
});

/**
 * Solana xStocks discovery snapshot.
 *
 * IMPORTANT: this is a convenience registry, not an allow-list. Before a live
 * DBC config is constructed, QUANTEK must re-read the selected mint on the
 * active RPC and verify token program, decimals, extensions and any DBC
 * token-badge requirement. Issuer/jurisdiction restrictions remain external
 * to this technical registry.
 */
export const TOKENIZED_QUOTE_ASSETS: readonly TokenizedQuoteAsset[] = [
  X("SPYx", "S&P 500 xStock", "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W", "etf"),
  X("CRWDx", "CrowdStrike xStock", "Xs7xXqkcK7K8urEqGg52SECi79dRp2cEKKuYjUePYDw"),
  X("TSLAx", "Tesla xStock", "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB"),
  X("MCDx", "McDonald's xStock", "XsqE9cRRpzxcGKDXj1BJ7Xmg4GRhZoyY1KpmGSxAWT2"),
  X("GOOGLx", "Alphabet xStock", "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN"),
  X("VTIx", "Vanguard Total Stock Market ETF xStock", "XsssYEQjzxBCFgvYFFNuhJFBeHNdLWYeUSP8F45cDr9", "etf"),
  X("Vx", "Visa xStock", "XsqgsbXwWogGJsNcVZ3TyVouy2MbTkfCFhCGGGcQZ2p"),
  X("ORCLx", "Oracle xStock", "XsjFwUPiLofddX5cWFHW35GCbXcSu1BCUGfxoQAQjeL"),
  X("WMTx", "Walmart xStock", "Xs151QeqTCiuKtinzfRATnUESM2xTU6V9Wy8Vy538ci"),
  X("JPMx", "JPMorgan Chase xStock", "XsMAqkcKsUewDrzVkait4e5u4y8REgtyS7jWgCpLV2C"),
  X("MDTx", "Medtronic xStock", "XsDgw22qRLTv5Uwuzn6T63cW69exG41T6gwQhEK22u2"),
  X("MRVLx", "Marvell xStock", "XsuxRGDzbLjnJ72v74b7p9VY6N66uYgTCyfwwRjVCJA"),
  X("QQQx", "Nasdaq-100 ETF xStock", "Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ", "etf"),
  X("AMZNx", "Amazon xStock", "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg"),
  X("AZNx", "AstraZeneca xStock", "Xs3ZFkPYT2BN7qBMqf1j1bfTeTm1rFzEFSsQ1z3wAKU"),
  X("HONx", "Honeywell xStock", "XsRbLZthfABAPAfumWNEJhPyiKDW6TvDVeAeW7oKqA2"),
  X("ACNx", "Accenture xStock", "Xs5UJzmCRQ8DWZjskExdSQDnbE6iLkRu2jjrRAB1JSU"),
  X("HDx", "Home Depot xStock", "XszjVtyhowGjSC5odCqBpW1CtXXwXjYokymrk7fGKD3"),
  X("GMEx", "GameStop xStock", "Xsf9mBktVB9BSU5kf4nHxPq5hCBJ2j2ui3ecFGxPRGc"),
  X("HOODx", "Robinhood xStock", "XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg"),
  X("INTCx", "Intel xStock", "XshPgPdXFRWB8tP1j82rebb2Q9rPgGX37RuqzohmArM"),
  X("DFDVx", "DeFi Development Corp xStock", "Xs2yquAgsHByNzx68WJC55WHjHBvG9JsMB7CWjTLyPy"),
  X("BRK.Bx", "Berkshire Hathaway xStock", "Xs6B6zawENwAbWVi7w92rjazLuAr5Az59qgWKcNb45x"),
  X("COINx", "Coinbase xStock", "Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu"),
  X("BACx", "Bank of America xStock", "XswsQk4duEQmCbGzfqUUWYmi7pV7xpJ9eEmLHXCaEQP"),
  X("CVXx", "Chevron xStock", "XsNNMt7WTNA2sV3jrb1NNfNgapxRF5i4i6GcnTRRHts"),
  X("CSCOx", "Cisco xStock", "Xsr3pdLQyXvDJBFgpR5nexCEZwXvigb8wbPYp4YoNFf"),
  X("PGx", "Procter & Gamble xStock", "XsYdjDjNUygZ7yGKfQaB6TxLh2gC6RRjzLtLAGJrhzV"),
  X("CMCSAx", "Comcast xStock", "XsvKCaNsxg2GN8jjUmq71qukMJr7Q1c5R2Mk9P8kcS8"),
  X("CRCLx", "Circle xStock", "XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1"),
  X("METAx", "Meta xStock", "Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu"),
  X("LINx", "Linde xStock", "XsSr8anD1hkvNMu8XQiVcmiaTP7XGvYu7Q58LdmtE8Z"),
  X("UNHx", "UnitedHealth xStock", "XszvaiXGPwvk2nwb3o9C1CX4K6zH8sez11E6uyup6fe"),
  X("PEPx", "PepsiCo xStock", "Xsv99frTRUeornyvCfvhnDesQDWuvns1M852Pez91vF"),
  X("AMBRx", "Amber xStock", "XsaQTCgebC2KPbf27KUhdv5JFvHhQ4GDAPURwrEhAzb"),
  X("MSFTx", "Microsoft xStock", "XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX"),
  X("MAx", "Mastercard xStock", "XsApJFV9MAktqnAc6jqzsHVujxkGm9xcSUffaBoYLKC"),
  X("NVOx", "Novo Nordisk xStock", "XsfAzPzYrYjd4Dpa9BU3cusBsvWfVB9gBcyGC87S57n"),
  X("PMx", "Philip Morris xStock", "Xsba6tUnSjDae2VcopDB6FGGDaxRrewFCDa5hKn5vT3"),
  X("MSTRx", "Strategy (MicroStrategy) xStock", "XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ"),
  X("XOMx", "Exxon Mobil xStock", "XsaHND8sHyfMfsWPj6kSdd5VwvCayZvjYgKmmcNL5qh"),
  X("PFEx", "Pfizer xStock", "XsAtbqkAP1HJxy7hFDeq7ok6yM43DQ9mQ1Rh861X8rw"),
  X("GLDx", "Gold ETF xStock", "Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re", "commodity-etf"),
  X("NVDAx", "NVIDIA xStock", "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh"),
  X("DHRx", "Danaher xStock", "Xseo8tgCZfkHxWS9xbFYeKFyMSbWEvZGFV1Gh53GtCV"),
  X("GSx", "Goldman Sachs xStock", "XsgaUyp4jd1fNBCxgtTKkW64xnnhQcvgaxzsbAq5ZD1"),
  X("TMOx", "Thermo Fisher Scientific xStock", "Xs8drBWy3Sd5QY3aifG9kt9KFs2K3PGZmx7jWrsrk57"),
  X("MRKx", "Merck xStock", "XsnQnU7AdbRZYe2akqqpibDdXjkieGFfSkbkjX1Sd1X"),
  X("ABTx", "Abbott xStock", "XsHtf5RpxsQ7jeJ9ivNewouZKJHbPxhPoEy6yYvULr7"),
  X("CRMx", "Salesforce xStock", "XsczbcQ3zfcgAEt9qHQES8pxKAVG5rujPSHQEXi4kaN"),
  X("TQQQx", "ProShares UltraPro QQQ xStock", "XsjQP3iMAaQ3kQScQKthQpx9ALRbjKAjQtHg6TFomoc", "etf"),
  X("JNJx", "Johnson & Johnson xStock", "XsGVi5eo1Dh2zUpic4qACcjuWGjNv8GCt3dm5XcX6Dn"),
  X("ABBVx", "AbbVie xStock", "XswbinNKyPmzTa5CskMbCPvMW6G5CMnZXZEeQSSQoie"),
  X("APPx", "AppLovin xStock", "XsPdAVBi8Zc1xvv53k4JcMrQaEDTgkGqKYeh7AYgPHV"),
  X("NFLXx", "Netflix xStock", "XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL"),
  X("PLTRx", "Palantir xStock", "XsoBhf2ufR8fTyNSjqfU71DYGaE6Z3SUGAidpzriAA4"),
  X("LLYx", "Eli Lilly xStock", "Xsnuv4omNoHozR6EEW5mXkw8Nrny5rB3jVfLqi6gKMH"),
  X("AVGOx", "Broadcom xStock", "XsgSaSvNSqLTtFuyWPBhK9196Xb9Bbdyjj4fH3cPJGo"),
  X("KOx", "Coca-Cola xStock", "XsaBXg8dU5cPM6ehmVctMkVqoiRG2ZjMo1cyBJ3AykQ"),
  X("IBMx", "IBM xStock", "XspwhyYPdWVM8XBHZnpS9hgyag9MKjLRyE3tVfmCbSr"),
  X("AAPLx", "Apple xStock", "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp"),
] as const;

export function searchTokenizedQuoteAssets(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return TOKENIZED_QUOTE_ASSETS;
  return TOKENIZED_QUOTE_ASSETS.filter((asset) =>
    [asset.symbol, asset.name, asset.mint, asset.issuer].some((value) =>
      value.toLowerCase().includes(q),
    ),
  );
}

export function validateTokenizedQuoteRegistry() {
  const seen = new Set<string>();
  for (const asset of TOKENIZED_QUOTE_ASSETS) {
    const mint = new PublicKey(asset.mint).toBase58();
    if (seen.has(mint)) throw new Error(`Duplicate tokenized quote mint: ${mint}`);
    seen.add(mint);
  }
  if (TOKENIZED_QUOTE_ASSETS.length !== 61) {
    throw new Error(`Expected 61 tokenized quote presets, received ${TOKENIZED_QUOTE_ASSETS.length}.`);
  }
  return true;
}
