"use client";

import { Cl } from "@stacks/transactions";
import {
  assetSymbolToCode,
  type ListingFormPayload,
  type MarketplaceListing,
  type PublicAppConfig,
} from "@/lib/marketplace";
import { extractTransactionHash } from "@/lib/stacks";

function parseContractId(contractId: string) {
  const [address, name] = contractId.split(".");
  if (!address || !name) {
    throw new Error("The marketplace contract address is not configured.");
  }
  return { address, name };
}

export async function callMarketplaceContract(params: {
  requestWallet: (
    method: string,
    payload?: Record<string, unknown>,
  ) => Promise<unknown>;
  config: PublicAppConfig;
  functionName: string;
  functionArgs: unknown[];
}) {
  const response = await params.requestWallet("stx_callContract", {
    contract: params.config.contractAddress,
    functionName: params.functionName,
    functionArgs: params.functionArgs,
    network: params.config.network,
  });

  const txid = extractTransactionHash(response);
  if (!txid) {
    throw new Error("Wallet did not return a Stacks transaction id.");
  }

  return txid;
}

export function buildCreateListingArgs(
  payload: ListingFormPayload,
  metadataUri: string,
  config: PublicAppConfig,
) {
  const tokenContract =
    payload.asset === "STX"
      ? null
      : payload.asset === "USDCX"
        ? config.usdcxContract
        : config.sbtcContract;

  if (payload.asset !== "STX" && !tokenContract) {
    throw new Error(`${payload.asset} contract is not configured.`);
  }

  const tokenCv =
    tokenContract
      ? (() => {
          const { address, name } = parseContractId(tokenContract);
          return Cl.some(Cl.contractPrincipal(address, name));
        })()
      : Cl.none();

  return [
    Cl.stringUtf8(payload.title),
    Cl.stringUtf8(payload.summary),
    Cl.stringUtf8(metadataUri),
    Cl.uint(assetSymbolToCode(payload.asset)),
    Cl.uint(payload.price),
    tokenCv,
    Cl.bool(payload.x402Enabled),
  ];
}

export function buildBuyArgs(listing: MarketplaceListing) {
  if (listing.asset === "STX") {
    return {
      functionName: "buy-with-stx",
      functionArgs: [Cl.uint(listing.id)],
    };
  }

  if (!listing.tokenContract) {
    throw new Error(`${listing.asset} token contract is missing for listing ${listing.id}.`);
  }

  const { address, name } = parseContractId(listing.tokenContract);

  return {
    functionName: "buy-with-token",
    functionArgs: [Cl.uint(listing.id), Cl.contractPrincipal(address, name)],
  };
}

export async function waitForTransaction(
  txid: string,
  timeoutMs = 180_000,
): Promise<{
  status: string;
  txResult: string | null;
  error: string | null;
}> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await fetch(`/api/transactions/${txid}`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      status: string;
      txResult: string | null;
      error: string | null;
    };

    if (!response.ok) {
      throw new Error(payload.error || "Unable to fetch transaction status.");
    }

    if (payload.status !== "pending") {
      return payload;
    }

    await new Promise(resolve => setTimeout(resolve, 3_000));
  }

  throw new Error(`Timed out while waiting for ${txid}.`);
}
