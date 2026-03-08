"use client";

import { Cl } from "@stacks/transactions";
import { useEffect, useState } from "react";
import { useStacksWallet } from "@/components/stacks-wallet-provider";
import {
  buildCreateListingArgs,
  callMarketplaceContract,
  waitForTransaction,
} from "@/lib/browser-marketplace";
import {
  normalizeAsset,
  parseDisplayAmount,
  type DraftRecord,
  type ListingFormPayload,
  type PublicAppConfig,
} from "@/lib/marketplace";

type DraftResponse = {
  drafts: DraftRecord[];
  error?: string;
};

const initialForm: ListingFormPayload = {
  title: "",
  summary: "",
  category: "Agent service",
  premiumContent: "",
  price: "0.1",
  asset: "STX",
  x402Enabled: true,
};

export function SellerConsole({ config }: { config: PublicAppConfig }) {
  const { address, connected, connectWallet, networkMismatch, requestWallet } =
    useStacksWallet();
  const [form, setForm] = useState(initialForm);
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadDrafts(currentAddress?: string | null) {
    if (!currentAddress) {
      setDrafts([]);
      return;
    }

    const response = await fetch(
      `/api/listings/drafts?seller=${encodeURIComponent(currentAddress)}`,
      { cache: "no-store" },
    );
    const payload = (await response.json()) as DraftResponse;
    if (!response.ok) {
      throw new Error(payload.error || "Failed to load seller drafts.");
    }
    setDrafts(payload.drafts);
  }

  useEffect(() => {
    void loadDrafts(address);
  }, [address]);

  async function ensureWallet() {
    if (networkMismatch) {
      throw new Error(`Switch Leather to ${config.network} before transacting.`);
    }

    let walletAddress = address;
    if (!connected || !walletAddress) {
      walletAddress = await connectWallet();
    }
    if (!walletAddress) {
      throw new Error("Connect Leather to publish listings.");
    }
    return walletAddress;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const walletAddress = await ensureWallet();
      const atomicPrice = parseDisplayAmount(form.price, form.asset);

      const draftResponse = await fetch("/api/listings/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller: walletAddress,
          title: form.title,
          summary: form.summary,
          category: form.category,
          premiumContent: form.premiumContent,
        }),
      });

      const draftPayload = (await draftResponse.json()) as {
        draft?: DraftRecord;
        metadataUri?: string;
        error?: string;
      };

      if (!draftResponse.ok || !draftPayload.draft || !draftPayload.metadataUri) {
        throw new Error(draftPayload.error || "Failed to create the local listing draft.");
      }

      const txid = await callMarketplaceContract({
        requestWallet,
        config,
        functionName: "create-listing",
        functionArgs: buildCreateListingArgs(
          { ...form, price: atomicPrice },
          draftPayload.metadataUri,
          config,
        ),
      });

      setMessage(`Draft created. Waiting for create-listing confirmation ${txid}...`);

      const tx = await waitForTransaction(txid);
      if (tx.status !== "success") {
        throw new Error(tx.error || tx.txResult || "Create-listing transaction failed.");
      }

      const syncCreate = await fetch(
        `/api/listings/drafts/${draftPayload.draft.slug}/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ createTxId: txid }),
        },
      );
      const syncCreatePayload = (await syncCreate.json()) as {
        draft?: DraftRecord;
        error?: string;
      };
      if (!syncCreate.ok || !syncCreatePayload.draft?.contractListingId) {
        throw new Error(syncCreatePayload.error || "Failed to map the draft to an on-chain listing.");
      }

      setMessage(`Listing ${syncCreatePayload.draft.contractListingId} created. Sign the publish transaction next.`);

      const publishTxId = await callMarketplaceContract({
        requestWallet,
        config,
        functionName: "publish-listing",
        functionArgs: [Cl.uint(syncCreatePayload.draft.contractListingId)],
      });

      const publishResult = await waitForTransaction(publishTxId);
      if (publishResult.status !== "success") {
        throw new Error(publishResult.error || publishResult.txResult || "Publish transaction failed.");
      }

      const syncPublish = await fetch(
        `/api/listings/drafts/${draftPayload.draft.slug}/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publishTxId }),
        },
      );
      const syncPublishPayload = (await syncPublish.json()) as {
        error?: string;
      };
      if (!syncPublish.ok) {
        throw new Error(syncPublishPayload.error || "Failed to save publish metadata.");
      }

      setForm(initialForm);
      setMessage(`Listing published successfully. Create tx ${txid}, publish tx ${publishTxId}.`);
      await loadDrafts(walletAddress);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Seller flow failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <form className="panel flex flex-col gap-5" onSubmit={handleSubmit}>
        <div>
          <p className="label-muted">Seller flow</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Create, price, and publish a marketplace listing
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-200">
            Title
            <input
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white"
              onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))}
              required
              value={form.title}
            />
          </label>
          <label className="text-sm text-slate-200">
            Category
            <input
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white"
              onChange={event => setForm(prev => ({ ...prev, category: event.target.value }))}
              required
              value={form.category}
            />
          </label>
        </div>

        <label className="text-sm text-slate-200">
          Public summary
          <textarea
            className="mt-2 min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white"
            onChange={event => setForm(prev => ({ ...prev, summary: event.target.value }))}
            required
            value={form.summary}
          />
        </label>

        <label className="text-sm text-slate-200">
          Premium content or agent instructions
          <textarea
            className="mt-2 min-h-36 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white"
            onChange={event =>
              setForm(prev => ({ ...prev, premiumContent: event.target.value }))
            }
            required
            value={form.premiumContent}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm text-slate-200">
            Price
            <input
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white"
              min="0"
              onChange={event => setForm(prev => ({ ...prev, price: event.target.value }))}
              required
              step={form.asset === "SBTC" ? "0.00000001" : "0.000001"}
              type="number"
              value={form.price}
            />
          </label>
          <label className="text-sm text-slate-200">
            Asset
            <select
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white"
              onChange={event =>
                setForm(prev => ({ ...prev, asset: normalizeAsset(event.target.value) }))
              }
              value={form.asset}
            >
              <option value="STX">STX</option>
              <option value="SBTC">sBTC</option>
              <option value="USDCX">USDCx</option>
            </select>
          </label>
          <label className="flex items-end gap-3 rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm text-slate-200">
            <input
              checked={form.x402Enabled}
              onChange={event =>
                setForm(prev => ({ ...prev, x402Enabled: event.target.checked }))
              }
              type="checkbox"
            />
            Enable x402 paywall
          </label>
        </div>

        <button
          className="rounded-full bg-amber-300 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Publishing..." : "Create and publish"}
        </button>

        {message ? <p className="text-sm text-slate-300">{message}</p> : null}
      </form>

      <div className="panel flex flex-col gap-4">
        <div>
          <p className="label-muted">Seller inventory</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Drafts and linked listings</h2>
        </div>
        {!drafts.length ? (
          <div className="panel-soft text-sm text-slate-300">
            Connect Leather to load seller drafts.
          </div>
        ) : null}
        {drafts.map(draft => (
          <div key={draft.slug} className="panel-soft flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-medium text-white">{draft.title}</h3>
                <p className="mt-1 text-sm text-slate-300">{draft.summary}</p>
              </div>
              <div className="rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-300">
                {draft.contractListingId ? `#${draft.contractListingId}` : "Local draft"}
              </div>
            </div>
            <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
              <div>
                <span className="label-muted">Create tx</span>
                <p className="mt-1 break-all">{draft.createTxId || "Pending"}</p>
              </div>
              <div>
                <span className="label-muted">Publish tx</span>
                <p className="mt-1 break-all">{draft.publishTxId || "Pending"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
