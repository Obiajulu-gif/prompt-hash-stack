"use client";

import { useEffect, useMemo, useState } from "react";
import { type PaymentRequirementsV2 } from "x402-stacks";
import { useStacksWallet } from "@/components/stacks-wallet-provider";
import {
  buildBuyArgs,
  callMarketplaceContract,
  waitForTransaction,
} from "@/lib/browser-marketplace";
import {
  formatAtomicAmount,
  type MarketplaceListing,
  type PublicAppConfig,
} from "@/lib/marketplace";
import {
  createNetworkInstance,
  createX402PaymentPayload,
  createUnsignedPaymentTransaction,
  extractSignedTransaction,
  getAssetColor,
  getPublicKeyForAddress,
} from "@/lib/stacks";

type ListingsResponse = {
  listings: MarketplaceListing[];
  error?: string;
  requiresConfiguration?: boolean;
  unavailableReason?: string;
};

export function ListingsBrowser({ config }: { config: PublicAppConfig }) {
  const { address, connected, connectWallet, networkMismatch, requestWallet } =
    useStacksWallet();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [localMode, setLocalMode] = useState(false);
  const [busyListingId, setBusyListingId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Record<number, string>>({});
  const [unlockedContent, setUnlockedContent] = useState<Record<number, string>>(
    {},
  );

  async function loadListings() {
    setLoading(true);
    setError(null);
    setNotice(null);
    setLocalMode(false);
    try {
      const response = await fetch("/api/listings", { cache: "no-store" });
      const payload = (await response.json()) as ListingsResponse;
      if (payload.requiresConfiguration) {
        setListings(payload.listings);
        setLocalMode(true);
        setNotice(
          payload.unavailableReason ||
            "Marketplace contract not configured. Showing local prompts only.",
        );
        return;
      }
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load marketplace listings.");
      }
      setListings(payload.listings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load marketplace listings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadListings();
  }, []);

  const emptyState = useMemo(
    () => (
      <div className="panel text-sm text-slate-300">
        {localMode
          ? "No local prompts yet. Use the seller console to save the first prompt."
          : "No published listings yet. Use the seller console to create the first Stacks marketplace entry."}
      </div>
    ),
    [localMode],
  );

  async function ensureWallet() {
    if (networkMismatch) {
      throw new Error(`Switch Leather to ${config.network} before transacting.`);
    }

    let walletAddress = address;
    if (!connected || !walletAddress) {
      walletAddress = await connectWallet();
    }
    if (!walletAddress) {
      throw new Error("Connect Leather to continue.");
    }

    return walletAddress;
  }

  async function buyOnChain(listing: MarketplaceListing) {
    setBusyListingId(listing.id);
    setMessages(prev => ({ ...prev, [listing.id]: "Waiting for wallet signature..." }));

    try {
      const walletAddress = await ensureWallet();
      const { functionArgs, functionName } = buildBuyArgs(listing);
      const txid = await callMarketplaceContract({
        requestWallet,
        config,
        functionName,
        functionArgs,
      });

      setMessages(prev => ({ ...prev, [listing.id]: `Broadcasted ${txid}. Waiting for confirmation...` }));

      const result = await waitForTransaction(txid);
      if (result.status !== "success") {
        throw new Error(result.error || result.txResult || "Purchase transaction failed.");
      }

      setMessages(prev => ({
        ...prev,
        [listing.id]: `Purchase confirmed for ${walletAddress}.`,
      }));
    } catch (err) {
      setMessages(prev => ({
        ...prev,
        [listing.id]: err instanceof Error ? err.message : "On-chain purchase failed.",
      }));
    } finally {
      setBusyListingId(null);
    }
  }

  async function unlockWithX402(listing: MarketplaceListing) {
    setBusyListingId(listing.id);
    setMessages(prev => ({ ...prev, [listing.id]: "Preparing x402 challenge..." }));

    try {
      const walletAddress = await ensureWallet();

      const firstAttempt = await fetch(`/api/agent/listings/${listing.id}/content`, {
        method: "GET",
        headers: {
          "x-buyer-wallet": walletAddress,
        },
      });

      if (firstAttempt.ok) {
        const payload = (await firstAttempt.json()) as { content: string };
        setUnlockedContent(prev => ({ ...prev, [listing.id]: payload.content }));
        setMessages(prev => ({ ...prev, [listing.id]: "Content unlocked." }));
        return;
      }

      if (firstAttempt.status !== 402) {
        const payload = (await firstAttempt.json()) as { error?: string };
        throw new Error(payload.error || "The x402 endpoint rejected this request.");
      }

      const paymentRequired = (await firstAttempt.json()) as {
        accepts: PaymentRequirementsV2[];
      };

      const accepted = paymentRequired.accepts[0];
      if (!accepted) {
        throw new Error("The x402 challenge did not include a payable option.");
      }

      const publicKey = await getPublicKeyForAddress(
        requestWallet,
        walletAddress,
        config.network,
      );
      if (!publicKey) {
        throw new Error("Leather did not expose a public key for transaction signing.");
      }

      const unsignedHex = await createUnsignedPaymentTransaction({
        asset: listing.asset,
        amountAtomic: accepted.amount,
        buyerAddress: walletAddress,
        payTo: accepted.payTo,
        tokenContract: accepted.asset === "STX" ? null : accepted.asset,
        publicKey,
        memo: `x402:${listing.id}`,
        networkInstance: createNetworkInstance(config.network),
      });

      setMessages(prev => ({ ...prev, [listing.id]: "Sign the x402 payment in Leather..." }));

      const signed = await requestWallet("stx_signTransaction", {
        transaction: unsignedHex,
        broadcast: false,
      });

      const signedTransaction = extractSignedTransaction(signed);
      if (!signedTransaction) {
        throw new Error("Leather did not return a signed payment transaction.");
      }

      const paymentPayload = createX402PaymentPayload(signedTransaction, accepted);

      const secondAttempt = await fetch(`/api/agent/listings/${listing.id}/content`, {
        method: "GET",
        headers: {
          "x-buyer-wallet": walletAddress,
          "payment-signature": btoa(JSON.stringify(paymentPayload)),
        },
      });

      const payload = (await secondAttempt.json()) as {
        content?: string;
        error?: string;
      };

      if (!secondAttempt.ok || !payload.content) {
        throw new Error(payload.error || "x402 settlement failed.");
      }

      setUnlockedContent(prev => ({ ...prev, [listing.id]: payload.content as string }));
      setMessages(prev => ({ ...prev, [listing.id]: "x402 payment settled and access recorded." }));
    } catch (err) {
      setMessages(prev => ({
        ...prev,
        [listing.id]: err instanceof Error ? err.message : "x402 purchase failed.",
      }));
    } finally {
      setBusyListingId(null);
    }
  }

  if (loading) {
    return <div className="panel text-sm text-slate-300">Loading listings...</div>;
  }

  if (error) {
    return <div className="panel text-sm text-rose-200">{error}</div>;
  }

  if (!listings.length) {
    return (
      <div className="space-y-4">
        {notice ? (
          <div className="panel text-sm text-amber-100">{notice}</div>
        ) : null}
        {emptyState}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notice ? <div className="panel text-sm text-amber-100">{notice}</div> : null}
      <div className="grid gap-6 lg:grid-cols-2">
      {listings.map(listing => (
        <article key={listing.id} className="panel flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="label-muted">Listing #{listing.id}</p>
              <h2 className="text-2xl font-semibold text-white">{listing.title}</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                {listing.summary}
              </p>
            </div>
            <div className={`rounded-full border px-3 py-2 text-xs ${getAssetColor(listing.asset)}`}>
              {formatAtomicAmount(listing.priceAtomic, listing.asset)} {listing.asset}
            </div>
          </div>

          <div className="grid gap-4 text-sm text-slate-300 sm:grid-cols-3">
            <div className="panel-soft">
              <p className="label-muted">Category</p>
              <p className="mt-2 text-white">{listing.category}</p>
            </div>
            <div className="panel-soft">
              <p className="label-muted">Purchases</p>
              <p className="mt-2 text-white">{listing.purchaseCount}</p>
            </div>
            <div className="panel-soft">
              <p className="label-muted">x402</p>
              <p className="mt-2 text-white">
                {listing.x402Enabled ? "Enabled" : "Disabled"}
              </p>
            </div>
          </div>

          <div className="panel-soft text-sm text-slate-300">
            <p className="label-muted">Premium preview</p>
            <p className="mt-2">{listing.preview}</p>
          </div>

          {unlockedContent[listing.id] ? (
            <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-5 text-sm text-emerald-50">
              <p className="label-muted text-emerald-200/80">Unlocked content</p>
              <pre className="mt-3 whitespace-pre-wrap">{unlockedContent[listing.id]}</pre>
            </div>
          ) : null}

          {localMode ? (
            <div className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-300">
              This prompt is listed locally only. Configure <code>CONTRACT_ADDRESS</code>
              to enable on-chain purchases and x402 access.
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full bg-amber-300 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busyListingId === listing.id || localMode}
              onClick={() => void buyOnChain(listing)}
              type="button"
            >
              {localMode
                ? "On-chain unavailable"
                : busyListingId === listing.id
                  ? "Waiting..."
                  : "Buy on-chain"}
            </button>
            <button
              className="rounded-full border border-sky-300/50 px-4 py-2 text-sm text-sky-100 transition hover:bg-sky-400/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busyListingId === listing.id || !listing.x402Enabled || localMode}
              onClick={() => void unlockWithX402(listing)}
              type="button"
            >
              {localMode
                ? "x402 unavailable"
                : listing.x402Enabled
                  ? "Buy via x402"
                  : "x402 disabled"}
            </button>
          </div>

          {messages[listing.id] ? (
            <p className="text-sm text-slate-300">{messages[listing.id]}</p>
          ) : null}
        </article>
      ))}
      </div>
    </div>
  );
}
