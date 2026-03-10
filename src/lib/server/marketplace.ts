import "server-only";

import { makeContractCall, broadcastTransaction, Cl, cvToJSON } from "@stacks/transactions";
import { getContractParts, getRecorderAccount, getStacksNetwork } from "@/lib/app-config";
import {
  assetCodeToSymbol,
  metadataUriFromSlug,
  parseListingIdFromTxRepr,
  previewFromContent,
  slugFromMetadataUri,
  type ChainListing,
  type MarketplaceListing,
} from "@/lib/marketplace";
import {
  callReadOnlyContract,
  getTransaction,
  isTransactionSuccessful,
  type HiroTransaction,
} from "@/lib/server/hiro";
import { getDraft, listDrafts, listDraftsBySeller, updateDraft } from "@/lib/server/drafts";

function unwrapReadOnlyOk(value: unknown) {
  const json = cvToJSON(value as never) as {
    success?: boolean;
    value?: any;
  };

  if (!json.success) {
    throw new Error("Read-only contract call returned an error.");
  }

  return json.value;
}

function optionalValue(node: any) {
  return node?.value ?? null;
}

function parseChainListing(id: number, raw: any): ChainListing | null {
  const tuple = optionalValue(raw);
  if (!tuple?.value) {
    return null;
  }

  const fields = tuple.value as Record<string, any>;
  const tokenContractNode = optionalValue(fields["token-contract"]);

  return {
    id,
    seller: fields.seller.value,
    title: fields.title.value,
    summary: fields.summary.value,
    metadataUri: fields["metadata-uri"].value,
    asset: assetCodeToSymbol(Number(fields.asset.value)),
    priceAtomic: fields.price.value,
    tokenContract: tokenContractNode?.value ?? null,
    published: Boolean(fields.published.value),
    x402Enabled: Boolean(fields["x402-enabled"].value),
    purchaseCount: Number(fields["purchase-count"].value),
    createdAt: Number(fields["created-at"].value),
  };
}

export async function getListingCount() {
  const raw = await callReadOnlyContract("get-listing-count", []);
  const value = unwrapReadOnlyOk(raw);
  return Number(value.value ?? 0);
}

export async function getChainListing(id: number) {
  const raw = await callReadOnlyContract("get-listing", [Cl.uint(id)]);
  return parseChainListing(id, unwrapReadOnlyOk(raw));
}

export async function getAllChainListings() {
  const count = await getListingCount();
  const listings = await Promise.all(
    Array.from({ length: count }, (_, index) => getChainListing(index + 1)),
  );
  return listings.filter((listing): listing is ChainListing => Boolean(listing));
}

export async function getMarketplaceListings() {
  const [chainListings, drafts] = await Promise.all([getAllChainListings(), listDrafts()]);
  const draftsBySlug = new Map(drafts.map(draft => [draft.slug, draft]));

  return chainListings
    .filter(listing => listing.published)
    .map(listing => {
      const slug = slugFromMetadataUri(listing.metadataUri);
      const draft = draftsBySlug.get(slug);
      return {
        ...listing,
        slug,
        category: draft?.category ?? "General",
        preview: draft ? previewFromContent(draft.premiumContent) : "On-chain listing exists, but local premium content is missing.",
        contentLinked: Boolean(draft?.premiumContent),
        createTxId: draft?.createTxId ?? null,
        publishTxId: draft?.publishTxId ?? null,
      } satisfies MarketplaceListing;
    });
}

export async function getLocalDraftListings() {
  const drafts = await listDrafts();

  return drafts.map((draft, index) => ({
    id: draft.contractListingId ?? index + 1,
    seller: draft.seller,
    title: draft.title,
    summary: draft.summary,
    metadataUri: metadataUriFromSlug(draft.slug),
    asset: draft.asset,
    priceAtomic: draft.priceAtomic,
    tokenContract: null,
    published: true,
    x402Enabled: draft.x402Enabled,
    purchaseCount: 0,
    createdAt: Math.floor(new Date(draft.createdAt).getTime() / 1000),
    slug: draft.slug,
    category: draft.category,
    preview: previewFromContent(draft.premiumContent),
    contentLinked: Boolean(draft.premiumContent),
    createTxId: draft.createTxId,
    publishTxId: draft.publishTxId,
  })) satisfies MarketplaceListing[];
}

export async function getListingWithDraft(id: number) {
  const listing = await getChainListing(id);
  if (!listing) {
    return null;
  }

  const slug = slugFromMetadataUri(listing.metadataUri);
  const draft = await getDraft(slug);

  return {
    listing,
    draft,
  };
}

export async function getSellerDrafts(seller: string) {
  return listDraftsBySeller(seller);
}

export async function hasListingAccess(listingId: number, address: string) {
  const raw = await callReadOnlyContract("has-access", [
    Cl.uint(listingId),
    Cl.standardPrincipal(address),
  ]);
  const value = unwrapReadOnlyOk(raw);
  return Boolean(value.value);
}

export async function getOwnedMarketplaceListings(address: string) {
  const listings = await getMarketplaceListings();
  const checks = await Promise.all(
    listings.map(async listing => ({
      listing,
      hasAccess: await hasListingAccess(listing.id, address),
    })),
  );

  return checks.filter(entry => entry.hasAccess).map(entry => entry.listing);
}

export async function syncDraftAfterCreate(slug: string, txid: string) {
  const tx = await getTransaction(txid);
  if (!isTransactionSuccessful(tx)) {
    throw new Error(`Create transaction ${txid} is not confirmed yet.`);
  }

  const listingId = parseListingIdFromTxRepr(tx.tx_result?.repr);
  if (!listingId) {
    throw new Error(`Could not extract listing id from transaction ${txid}.`);
  }

  return updateDraft(slug, {
    contractListingId: listingId,
    createTxId: txid,
  });
}

export async function syncDraftAfterPublish(slug: string, txid: string) {
  const tx = await getTransaction(txid);
  if (!isTransactionSuccessful(tx)) {
    throw new Error(`Publish transaction ${txid} is not confirmed yet.`);
  }

  return updateDraft(slug, {
    publishTxId: txid,
  });
}

export async function recordX402PurchaseOnChain(
  listingId: number,
  buyerAddress: string,
  paymentTxId: string,
) {
  const recorder = getRecorderAccount();
  if (!recorder) {
    throw new Error("WALLET_PRIVATE_KEY must be configured for x402 access recording.");
  }

  const { address, name } = getContractParts();

  const transaction = await makeContractCall({
    contractAddress: address,
    contractName: name,
    functionName: "record-x402-purchase",
    functionArgs: [
      Cl.uint(listingId),
      Cl.standardPrincipal(buyerAddress),
      Cl.bufferFromHex(paymentTxId.replace(/^0x/i, "")),
    ],
    senderKey: recorder.privateKey,
    network: getStacksNetwork(),
  });

  const broadcast = await broadcastTransaction(transaction, getStacksNetwork());
  if ("error" in broadcast && broadcast.error) {
    throw new Error(broadcast.reason || broadcast.error);
  }

  return broadcast.txid;
}

export function transactionSummary(tx: HiroTransaction) {
  return {
    txid: tx.tx_id,
    status: tx.tx_status,
    txResult: tx.tx_result?.repr ?? null,
    error: tx.error ?? null,
    functionName: tx.contract_call?.function_name ?? null,
  };
}

export function metadataUriForDraft(slug: string) {
  return metadataUriFromSlug(slug);
}
