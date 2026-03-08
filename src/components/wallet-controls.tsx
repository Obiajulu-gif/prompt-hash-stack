"use client";

import { useStacksWallet } from "@/components/stacks-wallet-provider";
import { shortenAddress } from "@/lib/utils";

export function WalletControls() {
  const {
    address,
    addressNetwork,
    connected,
    connecting,
    network,
    networkMismatch,
    connectWallet,
    disconnectWallet,
  } = useStacksWallet();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
        Leather target: <span className="font-medium text-amber-200">{network}</span>
      </div>
      {connected ? (
        <>
          <div className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs text-sky-100">
            {shortenAddress(address || "")}
            {addressNetwork ? ` · ${addressNetwork}` : ""}
          </div>
          {networkMismatch ? (
            <div className="rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
              Switch Leather to {network}
            </div>
          ) : null}
          <button
            className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-300 hover:text-white"
            onClick={() => void disconnectWallet()}
            type="button"
          >
            Disconnect
          </button>
        </>
      ) : (
        <button
          className="rounded-full bg-amber-300 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={connecting}
          onClick={() => void connectWallet()}
          type="button"
        >
          {connecting ? "Connecting..." : "Connect Leather"}
        </button>
      )}
    </div>
  );
}
