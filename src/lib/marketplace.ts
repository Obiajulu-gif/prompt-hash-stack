import {
  BTCtoSats,
  microSTXtoSTX,
  microUSDCxToUSDCx,
  satsToBTC,
  STXtoMicroSTX,
  USDCxToMicroUSDCx,
} from "x402-stacks";

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
  const raw = typeof amountAtomic === "number" ? amountAtomic.toString() : amountAtomic;

  if (asset === "SBTC") {
    return satsToBTC(BigInt(raw));
  }

  if (asset === "USDCX") {
    return microUSDCxToUSDCx(BigInt(raw));
  }

  return microSTXtoSTX(BigInt(raw));
}

export function parseDisplayAmount(amount: string, asset: PaymentAsset): string {
  const normalized = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Amount must be numeric.");
  }

  if (asset === "SBTC") {
    return BTCtoSats(normalized).toString();
  }

  if (asset === "USDCX") {
    return USDCxToMicroUSDCx(normalized).toString();
  }

  return STXtoMicroSTX(normalized).toString();
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
