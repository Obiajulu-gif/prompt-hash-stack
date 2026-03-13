"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Sparkles } from "lucide-react";
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
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-sky-300 text-lg font-semibold text-slate-950 shadow-[0_12px_30px_rgba(125,211,252,0.15)]">
                PH
              </div>
              <div>
                <p className="label-muted">Stacks x402 marketplace</p>
                <h1 className="text-xl font-semibold text-white">
                  PromptHash Agentic Commerce
                </h1>
              </div>
            </Link>

            <div className="flex flex-wrap gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100 md:inline-flex">
                <Sparkles className="h-3.5 w-3.5" />
                {config.network} · {config.contractAddress ? "contract live" : "local fallback"}
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-2 text-xs text-sky-100 lg:inline-flex">
                <Cpu className="h-3.5 w-3.5" />
                {config.automationEnabled ? "automation ready" : "manual checkout mode"}
              </div>
            </div>
          </div>

          <WalletControls />
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1">
          {navItems.map(item => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${
                  isActive
                    ? "border-sky-300/60 bg-sky-400/10 text-white"
                    : "border-slate-700/80 text-slate-200 hover:border-sky-300/60 hover:text-white"
                }`}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
