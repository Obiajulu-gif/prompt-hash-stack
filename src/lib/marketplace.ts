export const PAYMENT_ASSET_CODES = {
  STX: 1,
  SBTC: 2,
  USDCX: 3,
} as const;

export type PaymentAsset = keyof typeof PAYMENT_ASSET_CODES;

export type DraftRecord = {
  slug: string;
  seller: string;
  title: string;
  summary: string;
  category: string;
  premiumContent: string;
  priceAtomic: string;
  asset: PaymentAsset;
  x402Enabled: boolean;
  contractListingId: number | null;
  createTxId: string | null;
  publishTxId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChainListing = {
  id: number;
  seller: string;
  title: string;
  summary: string;
  metadataUri: string;
  asset: PaymentAsset;
  priceAtomic: string;
  tokenContract: string | null;
  published: boolean;
  x402Enabled: boolean;
  purchaseCount: number;
  createdAt: number;
};

export type MarketplaceListing = ChainListing & {
  slug: string;
  category: string;
  preview: string;
  contentLinked: boolean;
  createTxId: string | null;
  publishTxId: string | null;
};

export type PublicAppConfig = {
  network: "mainnet" | "testnet";
  contractAddress: string;
  sbtcContract: string | null;
  usdcxContract: string | null;
  automationEnabled: boolean;
};

export type ListingFormPayload = {
  title: string;
  summary: string;
  category: string;
  premiumContent: string;
  price: string;
  asset: PaymentAsset;
  x402Enabled: boolean;
};

export function assetCodeToSymbol(code: number): PaymentAsset {
  if (code === PAYMENT_ASSET_CODES.SBTC) return "SBTC";
  if (code === PAYMENT_ASSET_CODES.USDCX) return "USDCX";
  return "STX";
}

export function assetSymbolToCode(asset: PaymentAsset): number {
  return PAYMENT_ASSET_CODES[asset];
}

export function normalizeAsset(value: string | null | undefined): PaymentAsset {
  const upper = value?.trim().toUpperCase();
  if (upper === "SBTC") return "SBTC";
  if (upper === "USDCX") return "USDCX";
  return "STX";
}

export function formatAtomicAmount(amountAtomic: string | number, asset: PaymentAsset) {
  const decimals = asset === "SBTC" ? 8 : 6;
  const raw = String(amountAtomic ?? "0");
  const padded = raw.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

export function parseDisplayAmount(amount: string, asset: PaymentAsset): string {
  const normalized = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Amount must be numeric.");
  }

  const decimals = asset === "SBTC" ? 8 : 6;
  const [whole, fraction = ""] = normalized.split(".");
  const fractionDigits = fraction.slice(0, decimals).padEnd(decimals, "0");
  const merged = `${whole}${fractionDigits}`.replace(/^0+/, "");
  return merged.length ? merged : "0";
}

export function metadataUriFromSlug(slug: string) {
  return `listing://market/${slug}`;
}

export function slugFromMetadataUri(metadataUri: string) {
  return metadataUri.replace(/^listing:\/\/market\//, "").trim();
}

export function previewFromContent(content: string) {
  return content.length > 120 ? `${content.slice(0, 117)}...` : content;
}

export function parseListingIdFromTxRepr(repr: string | null | undefined) {
  const match = repr?.match(/\(ok u(\d+)\)/);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}
