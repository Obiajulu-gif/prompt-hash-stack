import {
  AnchorMode,
  bytesToHex,
  Cl,
  makeUnsignedContractCall,
  makeUnsignedSTXTokenTransfer,
  principalCV,
  uintCV,
} from "@stacks/transactions";
import type { StacksMainnet, StacksTestnet } from "@stacks/network";
import type { PaymentAsset } from "@/lib/marketplace";

export function normalizeTxHash(raw: string): string {
  const hex = raw.replace(/^0x/i, "").toLowerCase();
  if (/^[a-f0-9]{64}$/.test(hex)) {
    return `0x${hex}`;
  }
  return raw.startsWith("0x") ? raw : `0x${raw}`;
}

/**
 * Extract transaction hash from Stacks wallet response.
 * Handles openSTXTransfer (FinishedTxData), request('stx_transferStx') (TransactionResult),
 * and various wallet-specific response shapes.
 */
export function extractTransactionHash(payload: unknown): string | null {
  const value = payload as Record<string, unknown>;
  if (!value || typeof value !== "object") return null;

  // Try multiple paths for transaction hash (wallet responses vary)
  const paths = [
    value.txId,
    value.txid,
    value.tx_id,
    value.txHash,
    value.transaction,
    (value as { result?: Record<string, unknown> }).result?.txId,
    (value as { result?: Record<string, unknown> }).result?.txid,
    (value as { result?: Record<string, unknown> }).result?.transaction,
    (value as { data?: Record<string, unknown> }).data?.txId,
    (value as { data?: Record<string, unknown> }).data?.txid,
    (value as { data?: Record<string, unknown> }).data?.transaction,
    (value as { stacksTransaction?: { txid?: string } }).stacksTransaction?.txid,
  ];

  for (const path of paths) {
    if (typeof path === "string" && path.trim().length > 0) {
      return normalizeTxHash(path);
    }
  }

  return null;
}

export function extractSignedTransaction(payload: unknown): string | null {
  const value = payload as Record<string, unknown>;
  if (!value || typeof value !== "object") return null;

  const signed =
    value.transaction ??
    (value as { result?: { transaction?: string } }).result?.transaction;

  if (typeof signed === "string" && signed.length > 0) {
    return signed.replace(/^0x/i, "");
  }

  return null;
}

export async function getPublicKeyForAddress(
  requestWallet: (
    method: string,
    params?: Record<string, unknown>,
  ) => Promise<unknown>,
  walletAddress: string,
  network: "mainnet" | "testnet",
) {
  for (const method of ["stx_getAccounts", "getAddresses", "stx_getAddresses"]) {
    try {
      const result = (await requestWallet(method, { network })) as
        | { accounts?: Array<{ address: string; publicKey?: string }> }
        | { addresses?: Array<{ address: string; publicKey?: string }> };
      const entries =
        (result as { accounts?: Array<{ address: string; publicKey?: string }> }).accounts ??
        (result as { addresses?: Array<{ address: string; publicKey?: string }> }).addresses ??
        [];
      const match = entries.find(
        entry =>
          entry.address?.toLowerCase() === walletAddress.toLowerCase() &&
          typeof entry.publicKey === "string",
      );
      if (match?.publicKey) {
        return match.publicKey;
      }
    } catch {
      // Try the next provider method.
    }
  }

  return null;
}

export async function createUnsignedPaymentTransaction(params: {
  asset: PaymentAsset;
  amountAtomic: string;
  buyerAddress: string;
  payTo: string;
  tokenContract: string | null;
  publicKey: string;
  memo?: string;
  networkInstance: StacksMainnet | StacksTestnet;
}) {
  if (params.asset === "STX") {
    const tx = await makeUnsignedSTXTokenTransfer({
      recipient: params.payTo,
      amount: BigInt(params.amountAtomic),
      publicKey: params.publicKey,
      network: params.networkInstance,
      memo: params.memo,
      anchorMode: AnchorMode.Any,
    });
    return bytesToHex(tx.serialize());
  }

  if (!params.tokenContract) {
    throw new Error("Token contract is required for non-STX x402 payments.");
  }

  const [contractAddress, contractName] = params.tokenContract.split(".");
  if (!contractAddress || !contractName) {
    throw new Error("Invalid token contract identifier.");
  }

  const tx = await makeUnsignedContractCall({
    contractAddress,
    contractName,
    functionName: "transfer",
    functionArgs: [
      uintCV(params.amountAtomic),
      principalCV(params.buyerAddress),
      principalCV(params.payTo),
    ],
    publicKey: params.publicKey,
    network: params.networkInstance,
    anchorMode: AnchorMode.Any,
  });

  return bytesToHex(tx.serialize());
}

export function getAssetColor(asset: PaymentAsset) {
  if (asset === "SBTC") return "bg-amber-400/15 text-amber-200 border-amber-300/30";
  if (asset === "USDCX") return "bg-emerald-400/15 text-emerald-200 border-emerald-300/30";
  return "bg-sky-400/15 text-sky-200 border-sky-300/30";
}
