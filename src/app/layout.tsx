import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { StacksWalletProvider } from "@/components/stacks-wallet-provider";
import { Toaster } from "@/components/ui/sonner";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "PromptHash x402 on Stacks",
  description:
    "Agentic commerce marketplace built with x402, Stacks smart contracts, sBTC, optional USDCx, and Leather wallet flows.",
  openGraph: {
    title: "PromptHash x402 on Stacks",
    description:
      "Buy and sell agentic commerce listings on Stacks with x402 payment gating and sBTC-ready contracts.",
    siteName: "PromptHash x402",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const network =
    process.env.STACKS_NETWORK === "mainnet" ? "mainnet" : "testnet";

  return (
    <html lang="en">
      <body className={`${display.variable} ${mono.variable}`}>
        <StacksWalletProvider network={network}>
          {children}
          <Toaster />
        </StacksWalletProvider>
      </body>
    </html>
  );
}
