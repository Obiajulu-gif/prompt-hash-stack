import { HomeLanding } from "@/components/home-landing";
import { SiteHeader } from "@/components/site-header";
import { getPublicAppConfig } from "@/lib/app-config";

export default function HomePage() {
  const config = getPublicAppConfig();

  return (
    <>
      <SiteHeader config={config} />
      <HomeLanding config={config} />
    </>
  );
}
