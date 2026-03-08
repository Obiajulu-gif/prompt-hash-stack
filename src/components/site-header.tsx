import Link from "next/link";
import type { PublicAppConfig } from "@/lib/marketplace";
import { WalletControls } from "@/components/wallet-controls";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/browse", label: "Marketplace" },
  { href: "/sell", label: "Sell" },
  { href: "/profile", label: "Access" },
  { href: "/agent", label: "Agentic x402" },
];

export function SiteHeader({ config }: { config: PublicAppConfig }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-sky-300 text-lg font-semibold text-slate-950">
                PH
              </div>
              <div>
                <p className="label-muted">Stacks x402 marketplace</p>
                <h1 className="text-xl font-semibold text-white">
                  PromptHash Agentic Commerce
                </h1>
              </div>
            </Link>
            <div className="hidden rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100 md:block">
              {config.network} · {config.contractAddress || "contract not deployed"}
            </div>
          </div>
          <WalletControls />
        </div>
        <nav className="flex flex-wrap gap-2">
          {navItems.map(item => (
            <Link
              key={item.href}
              className="rounded-full border border-slate-700/80 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-300/60 hover:text-white"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
