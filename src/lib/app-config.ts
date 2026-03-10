import "server-only";

import {
  getDefaultSBTCContract,
  getDefaultUSDCxContract,
  privateKeyToAccount,
} from "x402-stacks";
import type { PaymentAsset, PublicAppConfig } from "@/lib/marketplace";

export type StacksNetwork = "mainnet" | "testnet";

export function getStacksNetwork(): StacksNetwork {
  return process.env.STACKS_NETWORK === "mainnet" ? "mainnet" : "testnet";
}

export function getHiroApiBaseUrl() {
  const configured = process.env.RPC_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return getStacksNetwork() === "mainnet"
    ? "https://api.hiro.so"
    : "https://api.testnet.hiro.so";
}

export function getHiroHeaders() {
  const apiKey = process.env.HIRO_API_KEY?.trim();
  return apiKey ? { "x-api-key": apiKey } : {};
}

export function getContractAddress() {
  return process.env.CONTRACT_ADDRESS?.trim() || "";
}

export function hasContractAddress() {
  const contractId = getContractAddress();
  const [address, name] = contractId.split(".");
  return Boolean(address && name);
}

export function getContractParts() {
  const contractId = getContractAddress();
  const [address, name] = contractId.split(".");
  if (!address || !name) {
    throw new Error("CONTRACT_ADDRESS must be set to ST...contract-name.");
  }
  return { address, name };
}

export function getTokenContractId(asset: PaymentAsset): string | null {
  if (asset === "STX") return null;

  if (asset === "USDCX") {
    const override = process.env.USDCX_CONTRACT?.trim();
    if (override) return override;
    const contract = getDefaultUSDCxContract(getStacksNetwork());
    return `${contract.address}.${contract.name}`;
  }

  const override = process.env.SBTC_CONTRACT?.trim();
  if (override) return override;
  const contract = getDefaultSBTCContract(getStacksNetwork());
  return `${contract.address}.${contract.name}`;
}

export function getRecorderAccount() {
  const privateKey = process.env.WALLET_PRIVATE_KEY?.trim();
  if (!privateKey) return null;
  return privateKeyToAccount(privateKey, getStacksNetwork());
}

export function getPublicAppConfig(): PublicAppConfig {
  return {
    network: getStacksNetwork(),
    contractAddress: getContractAddress(),
    sbtcContract: getTokenContractId("SBTC"),
    usdcxContract: getTokenContractId("USDCX"),
    automationEnabled: Boolean(process.env.WALLET_PRIVATE_KEY?.trim()),
  };
}
