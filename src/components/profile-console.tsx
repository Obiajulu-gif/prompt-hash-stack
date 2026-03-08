"use client";

import { useEffect, useState } from "react";
import { useStacksWallet } from "@/components/stacks-wallet-provider";
import {
  formatAtomicAmount,
  type MarketplaceListing,
} from "@/lib/marketplace";

type AccessResponse = {
  listings: MarketplaceListing[];
  error?: string;
};

export function ProfileConsole() {
  const { address, connected, connectWallet } = useStacksWallet();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!address) {
        setListings([]);
        return;
      }

      const response = await fetch(
        `/api/profile/access?address=${encodeURIComponent(address)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as AccessResponse;
      if (!response.ok) {
        setMessage(payload.error || "Failed to load owned listings.");
        return;
      }
      setMessage(null);
      setListings(payload.listings);
    }

    void load();
  }, [address]);

  return (
    <div className="panel flex flex-col gap-5">
      <div>
        <p className="label-muted">Access state</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          On-chain ownership and unlocked listings
        </h2>
      </div>
      {!connected ? (
        <div className="panel-soft flex items-center justify-between gap-4">
          <p className="text-sm text-slate-300">
            Connect Leather to load your Stacks access state.
          </p>
          <button
            className="rounded-full bg-amber-300 px-4 py-2 text-sm font-medium text-slate-950"
            onClick={() => void connectWallet()}
            type="button"
          >
            Connect Leather
          </button>
        </div>
      ) : null}
      {message ? <p className="text-sm text-rose-200">{message}</p> : null}
      {connected && !listings.length ? (
        <div className="panel-soft text-sm text-slate-300">
          No recorded purchases yet for {address}.
        </div>
      ) : null}
      {listings.map(listing => (
        <div key={listing.id} className="panel-soft">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium text-white">{listing.title}</h3>
              <p className="mt-1 text-sm text-slate-300">{listing.summary}</p>
            </div>
            <div className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
              {formatAtomicAmount(listing.priceAtomic, listing.asset)} {listing.asset}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
