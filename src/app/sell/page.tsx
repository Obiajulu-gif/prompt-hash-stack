import { SellerConsole } from "@/components/seller-console";
import { SiteHeader } from "@/components/site-header";
import { getPublicAppConfig } from "@/lib/app-config";

export default function SellPage() {
  const config = getPublicAppConfig();

  return (
    <>
      <SiteHeader config={config} />
      <main className="page-shell">
        <section className="space-y-3">
          <p className="label-muted">Seller flow</p>
          <h2 className="text-4xl font-semibold text-white">Create and publish on Stacks</h2>
          <p className="max-w-3xl text-base text-slate-300">
            Premium content stays off-chain for x402 delivery, while listing state
            and purchase access live in the marketplace contract.
          </p>
        </section>
        <SellerConsole config={config} />
      </main>
    </>
  );
}
