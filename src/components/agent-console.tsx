"use client";

import { useEffect, useState } from "react";
import {
  formatAtomicAmount,
  type MarketplaceListing,
  type PublicAppConfig,
} from "@/lib/marketplace";

type ListingsResponse = {
  listings: MarketplaceListing[];
  error?: string;
  requiresConfiguration?: boolean;
  unavailableReason?: string;
};

export function AgentConsole({ config }: { config: PublicAppConfig }) {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/listings", { cache: "no-store" });
      const payload = (await response.json()) as ListingsResponse;
      if (payload.requiresConfiguration) {
        setListings([]);
        setSelectedListingId("");
        setMessage(
          payload.unavailableReason || "Marketplace contract not configured yet.",
        );
        return;
      }
      if (!response.ok) {
        setMessage(payload.error || "Failed to load x402-enabled listings.");
        return;
      }
      const filtered = payload.listings.filter(listing => listing.x402Enabled);
      setListings(filtered);
      if (filtered[0]) {
        setSelectedListingId(String(filtered[0].id));
      }
    }

    void load();
  }, []);

  async function runAutomation() {
    setRunning(true);
    setMessage(null);
    setContent(null);

    try {
      const response = await fetch("/api/dev/x402", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ listingId: Number(selectedListingId) }),
      });

      const payload = (await response.json()) as {
        content?: string;
        payment?: { txid?: string | null; buyer?: string | null };
        error?: string;
      };

      if (!response.ok || !payload.content) {
        throw new Error(payload.error || "Automated x402 payment failed.");
      }

      setContent(payload.content);
      setMessage(
        payload.payment?.txid
          ? `Agent payment settled in ${payload.payment.txid}.`
          : "Agent payment completed.",
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Automated x402 payment failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="panel flex flex-col gap-5">
        <div>
          <p className="label-muted">Development automation</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Run an autonomous x402 buyer from the server
          </h2>
        </div>
        <p className="text-sm text-slate-300">
          This route uses <code>WALLET_PRIVATE_KEY</code> server-side to prove the
          buyer flow works without a browser wallet. It is intended for testnet
          verification and hackathon demos only.
        </p>
        <label className="text-sm text-slate-200">
          x402-enabled listing
          <select
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-white"
            onChange={event => setSelectedListingId(event.target.value)}
            value={selectedListingId}
          >
            {listings.map(listing => (
              <option key={listing.id} value={listing.id}>
                #{listing.id} {listing.title} · {formatAtomicAmount(listing.priceAtomic, listing.asset)}{" "}
                {listing.asset}
              </option>
            ))}
          </select>
        </label>
        <button
          className="rounded-full bg-sky-300 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={running || !selectedListingId || !config.automationEnabled}
          onClick={() => void runAutomation()}
          type="button"
        >
          {config.automationEnabled
            ? running
              ? "Running x402 automation..."
              : "Execute automated x402 purchase"
            : "WALLET_PRIVATE_KEY not configured"}
        </button>
        {message ? <p className="text-sm text-slate-300">{message}</p> : null}
      </div>

      <div className="panel flex flex-col gap-5">
        <div>
          <p className="label-muted">Agent response</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Returned premium content
          </h2>
        </div>
        <div className="panel-soft min-h-72 text-sm text-slate-200">
          {content ? (
            <pre className="whitespace-pre-wrap">{content}</pre>
          ) : (
            "Run the automation flow to capture an x402-gated response here."
          )}
        </div>
      </div>
    </div>
  );
}
