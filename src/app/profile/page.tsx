import { ProfileConsole } from "@/components/profile-console";
import { SiteHeader } from "@/components/site-header";
import { getPublicAppConfig } from "@/lib/app-config";

export default function ProfilePage() {
  const config = getPublicAppConfig();

  return (
    <>
      <SiteHeader config={config} />
      <main className="page-shell">
        <section className="space-y-3">
          <p className="label-muted">Ownership</p>
          <h2 className="text-4xl font-semibold text-white">Purchased access</h2>
          <p className="max-w-3xl text-base text-slate-300">
            This view checks on-chain access grants for the connected Stacks
            address and shows the listings you already own.
          </p>
        </section>
        <ProfileConsole />
      </main>
    </>
  );
}
