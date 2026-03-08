import "server-only";

import { deserializeCV, serializeCV } from "@stacks/transactions";
import { getContractParts, getHiroApiBaseUrl } from "@/lib/app-config";

export type HiroTransaction = {
  tx_id: string;
  tx_status: string;
  tx_result?: {
    hex?: string;
    repr?: string;
  };
  contract_call?: {
    contract_id?: string;
    function_name?: string;
  };
  error?: string;
};

function encodeClarityArgument(value: unknown) {
  return `0x${Buffer.from(serializeCV(value)).toString("hex")}`;
}

async function hiroFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const apiKey = process.env.HIRO_API_KEY?.trim();
  if (apiKey) {
    headers.set("x-api-key", apiKey);
  }

  const response = await fetch(`${getHiroApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Hiro API request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

export async function callReadOnlyContract(
  functionName: string,
  args: unknown[],
  sender?: string,
) {
  const { address, name } = getContractParts();

  const body = {
    sender: sender || address,
    arguments: args.map(encodeClarityArgument),
  };

  const response = await hiroFetch<{ okay: boolean; result?: string; cause?: string }>(
    `/v2/contracts/call-read/${address}/${name}/${functionName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.okay || !response.result) {
    throw new Error(response.cause || `Read-only call failed for ${functionName}.`);
  }

  return deserializeCV(response.result);
}

export async function getTransaction(txid: string) {
  return hiroFetch<HiroTransaction>(`/extended/v1/tx/${txid}`);
}

export function isTransactionPending(tx: HiroTransaction) {
  return tx.tx_status === "pending";
}

export function isTransactionSuccessful(tx: HiroTransaction) {
  return tx.tx_status === "success";
}

export async function waitForTransaction(txid: string, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const tx = await getTransaction(txid);
    if (!isTransactionPending(tx)) {
      return tx;
    }
    await new Promise(resolve => setTimeout(resolve, 3_000));
  }

  throw new Error(`Timed out waiting for transaction ${txid}.`);
}
