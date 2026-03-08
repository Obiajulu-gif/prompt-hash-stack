import { ListingsBrowser } from "@/components/listings-browser";
import { SiteHeader } from "@/components/site-header";
import { getPublicAppConfig } from "@/lib/app-config";

export default function BrowsePage() {
  const config = getPublicAppConfig();

  return (
    <>
      <SiteHeader config={config} />
      <main className="page-shell">
        <section className="space-y-3">
          <p className="label-muted">Buyer flow</p>
          <h2 className="text-4xl font-semibold text-white">Browse and buy listings</h2>
          <p className="max-w-3xl text-base text-slate-300">
            Listings are loaded from the Clarity contract and enriched with local
            premium metadata for the hackathon demo.
          </p>
        </section>
        <ListingsBrowser config={config} />
      </main>
    </>
  );
}
