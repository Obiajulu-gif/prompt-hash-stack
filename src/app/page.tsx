import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getPublicAppConfig } from "@/lib/app-config";

const checklist = [
  "Stacks smart contract marketplace with draft -> publish -> purchase state",
  "sBTC-ready and optional USDCx token contract support",
  "Leather wallet connect, address detection, signing, and broadcasted contract calls",
  "x402 payment-gated content endpoint tied back to on-chain access recording",
  "Server-side automation for development using WALLET_PRIVATE_KEY",
];

export default function HomePage() {
  const config = getPublicAppConfig();

  return (
    <>
      <SiteHeader config={config} />
      <main className="page-shell">
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="panel space-y-5">
            <p className="label-muted">Hackathon build</p>
            <h2 className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Agentic commerce on Stacks with x402, sBTC, and Leather.
            </h2>
            <p className="max-w-3xl text-base text-slate-300 sm:text-lg">
              This project turns a prompt marketplace into a Stacks-native demo:
              sellers publish listings on-chain, buyers purchase directly or via
              x402, and successful x402 settlements are recorded back into the
              marketplace contract.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-amber-300 px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-amber-200"
                href="/browse"
              >
                Open marketplace
              </Link>
              <Link
                className="rounded-full border border-sky-300/60 px-5 py-3 text-sm text-sky-100 transition hover:bg-sky-400/10"
                href="/sell"
              >
                Create a listing
              </Link>
            </div>
          </div>

          <div className="panel flex flex-col gap-4">
            <div>
              <p className="label-muted">Runtime configuration</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Current target</h2>
            </div>
            <div className="panel-soft">
              <p className="label-muted">Stacks network</p>
              <p className="mt-2 text-white">{config.network}</p>
            </div>
            <div className="panel-soft">
              <p className="label-muted">Marketplace contract</p>
              <p className="mt-2 break-all text-sm text-slate-200">
                {config.contractAddress || "Set CONTRACT_ADDRESS after deployment."}
              </p>
            </div>
            <div className="panel-soft">
              <p className="label-muted">Automation</p>
              <p className="mt-2 text-slate-200">
                {config.automationEnabled
                  ? "Server-side dev signer enabled"
                  : "Set WALLET_PRIVATE_KEY to enable automated x402 tests"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {checklist.map(item => (
            <article key={item} className="panel-soft text-sm text-slate-200">
              {item}
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
