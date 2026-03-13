"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  Bot,
  Coins,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Store,
  Wallet,
} from "lucide-react";
import type { PublicAppConfig } from "@/lib/marketplace";

const featureCards = [
  {
    icon: Store,
    eyebrow: "Seller flow",
    title: "Draft, publish, monetize",
    description:
      "List prompt products with on-chain metadata, pricing, and publish controls from a single workflow.",
  },
  {
    icon: Wallet,
    eyebrow: "Buyer flow",
    title: "Wallet-native checkout",
    description:
      "Buyers connect Leather, sign purchases, and unlock access without leaving the Stacks payment flow.",
  },
  {
    icon: LockKeyhole,
    eyebrow: "x402 gating",
    title: "Paywall that records access",
    description:
      "x402 settlement and content delivery are tied back to contract access records so entitlement stays verifiable.",
  },
  {
    icon: Coins,
    eyebrow: "Asset support",
    title: "STX first, sBTC ready",
    description:
      "Run with native STX or expand into token-priced listings using the contract configuration already in the repo.",
  },
  {
    icon: Bot,
    eyebrow: "Automation",
    title: "Agent-compatible purchase path",
    description:
      "Backend automation can execute payment recording and content release when the recorder wallet is configured.",
  },
  {
    icon: ShieldCheck,
    eyebrow: "Traceability",
    title: "Contract-centric audit trail",
    description:
      "Listings, publication state, purchases, and recorder actions all map to explicit contract state transitions.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Create a prompt product",
    description:
      "Sellers prepare title, summary, pricing, premium content, and choose whether x402 gating is enabled.",
  },
  {
    step: "02",
    title: "Publish on-chain",
    description:
      "The marketplace contract stores the listing configuration so the catalog can be fetched from the network.",
  },
  {
    step: "03",
    title: "Complete payment",
    description:
      "Buyers use STX or supported tokens directly, or access can be recorded from the x402 settlement path.",
  },
  {
    step: "04",
    title: "Unlock premium output",
    description:
      "Profile and agent endpoints check purchased access so buyers and agents see only what they have paid for.",
  },
];

const audienceCards = [
  {
    title: "For prompt sellers",
    description:
      "Package monetizable prompts with pricing, preview text, publish state, and access control in one place.",
  },
  {
    title: "For buyers",
    description:
      "Discover listings, verify price assets, connect Leather, and manage purchased access from the profile view.",
  },
  {
    title: "For hackathon demos",
    description:
      "Show a complete Stacks commerce loop: contract publish, wallet purchase, x402 payment-gated delivery, and agent access.",
  },
];

const architecturePoints = [
  "Next.js interface for seller, buyer, profile, and agent workflows",
  "Stacks smart contract marketplace storing listing state and access grants",
  "Leather wallet connect for client-side signing and account detection",
  "x402 content route for payment-required delivery and recorder settlement",
];

function formatContractState(contractAddress: string) {
  return contractAddress
    ? "Live contract configured"
    : "Contract missing — local fallback mode";
}

export function HomeLanding({ config }: { config: PublicAppConfig }) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      gsap.from("[data-hero='eyebrow']", {
        y: 18,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      });

      gsap.from("[data-hero='title']", {
        y: 32,
        opacity: 0,
        duration: 0.9,
        delay: 0.08,
        ease: "power3.out",
      });

      gsap.from("[data-hero='copy']", {
        y: 28,
        opacity: 0,
        duration: 0.85,
        delay: 0.18,
        ease: "power3.out",
      });

      gsap.from("[data-hero='actions'] > *", {
        y: 24,
        opacity: 0,
        duration: 0.65,
        delay: 0.26,
        stagger: 0.1,
        ease: "power3.out",
      });

      gsap.from("[data-hero='metric']", {
        y: 26,
        opacity: 0,
        duration: 0.7,
        delay: 0.34,
        stagger: 0.08,
        ease: "power3.out",
      });

      gsap.from("[data-hero='panel']", {
        x: 40,
        opacity: 0,
        duration: 0.9,
        delay: 0.2,
        ease: "power3.out",
      });

      gsap.to("[data-hero='orb-a']", {
        y: -18,
        x: 10,
        duration: 4.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to("[data-hero='orb-b']", {
        y: 20,
        x: -12,
        duration: 5.1,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.utils.toArray<HTMLElement>("[data-reveal='section']").forEach(section => {
        gsap.from(section, {
          y: 42,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 82%",
            once: true,
          },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-reveal='card']").forEach((card, index) => {
        gsap.from(card, {
          y: 28,
          opacity: 0,
          duration: 0.7,
          delay: index * 0.04,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 88%",
            once: true,
          },
        });
      });
    }, rootRef);

    return () => context.revert();
  }, []);

  return (
    <main className="page-shell overflow-hidden" ref={rootRef}>
      <section className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="panel relative overflow-hidden border-slate-800/90 bg-slate-950/75 p-8 sm:p-10">
          <div
            className="absolute -left-12 top-0 h-44 w-44 rounded-full bg-amber-300/20 blur-3xl"
            data-hero="orb-a"
          />
          <div
            className="absolute right-0 top-24 h-52 w-52 rounded-full bg-sky-400/20 blur-3xl"
            data-hero="orb-b"
          />
          <div className="relative z-10 space-y-6">
            <div
              className="inline-flex items-center gap-2 rounded-full border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-sky-100"
              data-hero="eyebrow"
            >
              <Sparkles className="h-4 w-4" />
              On-chain prompt commerce for Stacks
            </div>

            <div className="space-y-4">
              <h1
                className="max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl xl:text-6xl"
                data-hero="title"
              >
                A richer prompt marketplace for Stacks, x402, and wallet-native
                access control.
              </h1>
              <p
                className="max-w-3xl text-base leading-7 text-slate-300 sm:text-lg"
                data-hero="copy"
              >
                PromptHash packages listing creation, on-chain publication, direct
                wallet checkout, and x402-gated content delivery into a single
                commerce experience. The goal is not just selling prompts — it is
                proving who paid, what they unlocked, and how agents can consume
                premium output safely.
              </p>
            </div>

            <div className="flex flex-wrap gap-3" data-hero="actions">
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-amber-200"
                href="/browse"
              >
                Explore marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-sky-300/60 px-6 py-3 text-sm text-sky-100 transition hover:bg-sky-400/10"
                href="/sell"
              >
                Launch a listing
                <Store className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-3 pt-2 sm:grid-cols-3">
              <article
                className="rounded-[1.25rem] border border-slate-800/80 bg-slate-950/60 p-4"
                data-hero="metric"
              >
                <p className="label-muted">Settlement model</p>
                <p className="mt-3 text-2xl font-semibold text-white">Direct + x402</p>
                <p className="mt-2 text-sm text-slate-400">
                  Support user-signed checkout and agent-friendly payment-gated access.
                </p>
              </article>
              <article
                className="rounded-[1.25rem] border border-slate-800/80 bg-slate-950/60 p-4"
                data-hero="metric"
              >
                <p className="label-muted">Supported assets</p>
                <p className="mt-3 text-2xl font-semibold text-white">
                  STX{config.sbtcContract ? " · sBTC" : ""}{config.usdcxContract ? " · USDCx" : ""}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Asset routing is driven by the marketplace contract configuration.
                </p>
              </article>
              <article
                className="rounded-[1.25rem] border border-slate-800/80 bg-slate-950/60 p-4"
                data-hero="metric"
              >
                <p className="label-muted">Deployment state</p>
                <p className="mt-3 text-2xl font-semibold text-white">{config.network}</p>
                <p className="mt-2 text-sm text-slate-400">
                  {formatContractState(config.contractAddress)}
                </p>
              </article>
            </div>
          </div>
        </div>

        <aside className="panel relative overflow-hidden p-0" data-hero="panel">
          <div className="border-b border-slate-800/80 bg-slate-950/80 p-6">
            <p className="label-muted">Launch control</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Runtime readiness</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              This environment snapshot mirrors the actual marketplace config used by
              the live buyer and seller flows.
            </p>
          </div>
          <div className="grid gap-4 p-6">
            <div className="rounded-[1.25rem] border border-emerald-300/20 bg-emerald-400/10 p-5">
              <p className="label-muted text-emerald-100/70">Network</p>
              <p className="mt-3 text-lg font-medium text-white">{config.network}</p>
              <p className="mt-2 text-sm text-emerald-50/80">
                Leather wallet connections and contract calls target this network.
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-700/70 bg-slate-950/60 p-5">
              <p className="label-muted">Marketplace contract</p>
              <p className="mt-3 break-all text-sm leading-6 text-slate-200">
                {config.contractAddress || "No contract configured yet."}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-700/70 bg-slate-950/60 p-5">
              <p className="label-muted">Automation path</p>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                {config.automationEnabled
                  ? "Recorder wallet is configured for backend-assisted x402 settlement flows."
                  : "Recorder wallet is not configured. Client-side flows still work, but automated x402 recording is limited."}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-700/70 bg-slate-950/60 p-5">
              <p className="label-muted">Available contract set</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-100">
                <span className="rounded-full border border-slate-700 px-3 py-2">Prompt marketplace</span>
                <span className="rounded-full border border-slate-700 px-3 py-2">
                  {config.sbtcContract ? "sBTC configured" : "sBTC optional"}
                </span>
                <span className="rounded-full border border-slate-700 px-3 py-2">
                  {config.usdcxContract ? "USDCx configured" : "USDCx optional"}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 lg:grid-cols-3" data-reveal="section">
        {audienceCards.map(card => (
          <article
            className="panel-soft h-full border-slate-800/80 bg-slate-950/45"
            data-reveal="card"
            key={card.title}
          >
            <p className="label-muted">Use case</p>
            <h2 className="mt-3 text-xl font-semibold text-white">{card.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{card.description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]" data-reveal="section">
        <div className="panel">
          <p className="label-muted">Workflow</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">
            From listing draft to premium content access
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-300">
            The product flow is designed to make the contract leg, the wallet leg,
            and the gated content leg visible to users and judges. Each stage maps
            to an actual route and contract action in this repository.
          </p>
          <div className="mt-8 space-y-4">
            {workflow.map(item => (
              <article
                className="rounded-[1.35rem] border border-slate-800/80 bg-slate-950/55 p-5"
                data-reveal="card"
                key={item.step}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-sky-300 font-semibold text-slate-950">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{item.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {featureCards.map(card => {
            const Icon = card.icon;
            return (
              <article
                className="panel-soft border-slate-800/80 bg-slate-950/45"
                data-reveal="card"
                key={card.title}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-200">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="label-muted mt-4">{card.eyebrow}</p>
                <h3 className="mt-3 text-xl font-semibold text-white">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{card.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel grid gap-6 xl:grid-cols-[0.95fr_1.05fr]" data-reveal="section">
        <div>
          <p className="label-muted">Architecture snapshot</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">
            A demo that connects UI, contract state, and gated delivery
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-300">
            The landing page should explain the product quickly, but the system
            design still matters. These layers are what make the marketplace more
            than a static storefront.
          </p>
        </div>
        <div className="grid gap-4">
          {architecturePoints.map(point => (
            <article
              className="flex items-start gap-4 rounded-[1.25rem] border border-slate-800/80 bg-slate-950/55 p-5"
              data-reveal="card"
              key={point}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-200">
                <Layers3 className="h-5 w-5" />
              </div>
              <p className="text-sm leading-7 text-slate-200">{point}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="panel relative overflow-hidden border-slate-800/90 bg-gradient-to-br from-slate-950 to-slate-900"
        data-reveal="section"
      >
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_45%)]" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="label-muted">Next action</p>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Improve the storefront, then drive users straight into the live flows.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              The new home page is meant to convert curiosity into action: browse
              listings, create a new prompt, or connect a wallet and verify the
              commerce loop end to end.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="rounded-full bg-amber-300 px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-amber-200"
              href="/browse"
            >
              Browse listings
            </Link>
            <Link
              className="rounded-full border border-slate-600 px-6 py-3 text-sm text-slate-100 transition hover:border-sky-300 hover:bg-sky-400/10"
              href="/agent"
            >
              Open agent flow
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
