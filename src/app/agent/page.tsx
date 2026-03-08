import { AgentConsole } from "@/components/agent-console";
import { SiteHeader } from "@/components/site-header";
import { getPublicAppConfig } from "@/lib/app-config";

export default function AgentPage() {
  const config = getPublicAppConfig();

  return (
    <>
      <SiteHeader config={config} />
      <main className="page-shell">
        <section className="space-y-3">
          <p className="label-muted">Agentic commerce</p>
          <h2 className="text-4xl font-semibold text-white">
            Autonomous x402 purchase for development
          </h2>
          <p className="max-w-3xl text-base text-slate-300">
            Use the dev signer to run the same x402 endpoint without Leather.
            This is the fastest way to demonstrate agent-to-agent payments on top
            of the Stacks marketplace contract.
          </p>
        </section>
        <AgentConsole config={config} />
      </main>
    </>
  );
}
