import {
  getDefaultSBTCContract,
  getDefaultUSDCxContract,
  X402PaymentVerifier,
  X402_HEADERS,
  isValidStacksAddress,
  networkToCAIP2,
  type PaymentPayloadV2,
  type PaymentRequiredV2,
  type PaymentRequirementsV2,
} from "x402-stacks";
import { parseDisplayAmount, type PaymentAsset } from "@/lib/marketplace";
import { getStacksNetwork } from "@/lib/app-config";

export { X402_HEADERS };

export function getStacksNetworkCAIP2() {
  return networkToCAIP2(getStacksNetwork());
}

export function getStacksNetworkForRegistration(): "stacks" {
  // x402scan requires just "stacks" regardless of mainnet/testnet
  return "stacks";
}

export function resolveX402Asset(asset: PaymentAsset): string {
  const network = getStacksNetwork();

  if (asset === "STX") return "STX";

  if (asset === "USDCX") {
    const override = process.env.USDCX_CONTRACT?.trim();
    if (override) return override;
    const contract = getDefaultUSDCxContract(network);
    return `${contract.address}.${contract.name}`;
  }

  const override = process.env.SBTC_CONTRACT?.trim();
  if (override) return override;
  const contract = getDefaultSBTCContract(network);
  return `${contract.address}.${contract.name}`;
}

const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;
const DECIMAL_PATTERN = /^\d+\.\d+$/;
const STACKS_CAIP2_PATTERN = /^stacks:\d+$/;

function normalizePositiveIntegerString(value: string): string {
  const normalized = value.replace(/^0+(?=\d)/, "");
  if (!POSITIVE_INTEGER_PATTERN.test(normalized)) {
    throw new Error("x402 amount must be a positive integer string in base units");
  }
  return normalized;
}

function normalizeAmountBaseUnits(
  rawAmount: string,
  currency: PaymentAsset,
): string {
  const value = String(rawAmount ?? "").trim();
  if (!value) {
    throw new Error("x402 amount is required");
  }

  if (DECIMAL_PATTERN.test(value)) {
    return normalizePositiveIntegerString(
      parseDisplayAmount(value, currency),
    );
  }

  return normalizePositiveIntegerString(value);
}

export function buildPaymentRequirements(params: {
  amountBaseUnits: string;
  currency: PaymentAsset;
  payTo: string;
}): PaymentRequirementsV2 {
  const network = getStacksNetworkCAIP2();
  if (!STACKS_CAIP2_PATTERN.test(network)) {
    throw new Error(`Invalid Stacks CAIP-2 network: ${network}`);
  }

  const payTo = params.payTo.trim();
  if (!isValidStacksAddress(payTo)) {
    throw new Error(`Invalid payTo Stacks address: ${payTo}`);
  }

  return {
    scheme: "exact",
    network,
    amount: normalizeAmountBaseUnits(params.amountBaseUnits, params.currency),
    asset: resolveX402Asset(params.currency),
    payTo,
    maxTimeoutSeconds: 300,
  };
}

export function buildPaymentRequiredResponse(params: {
  resourceUrl: string;
  description: string;
  amountBaseUnits: string;
  currency: PaymentAsset;
  payTo: string;
}): PaymentRequiredV2 {
  const resourceUrl = params.resourceUrl.trim();
  if (!resourceUrl) {
    throw new Error("x402 resource URL is required");
  }

  return {
    x402Version: 2,
    error: "Payment required",
    resource: {
      url: resourceUrl,
      description: params.description,
      mimeType: "application/json",
    },
    accepts: [
      buildPaymentRequirements({
        amountBaseUnits: params.amountBaseUnits,
        currency: params.currency,
        payTo: params.payTo,
      }),
    ],
  };
}

/**
 * Build V1-format 402 Payment Required response for x402scan compatibility.
 * V1 uses a flat structure with payment fields at the root level.
 */
export function buildPaymentRequiredResponseV1(params: {
  resourceUrl: string;
  description: string;
  amountBaseUnits: string;
  currency: PaymentAsset;
  payTo: string;
}): Record<string, unknown> {
  const maxTimeoutSeconds = 300;
  const amountNum = Number(params.amountBaseUnits) || 0;

  return {
    x402Version: 1,
    resource: params.resourceUrl, // V1: string URL, not object
    scheme: "exact",
    network: getStacksNetworkForRegistration(), // "stacks"
    maxAmountRequired: amountNum, // x402scan expects number type
    asset: resolveX402Asset(params.currency),
    payTo: params.payTo,
    description: params.description,
    mimeType: "application/json",
    maxTimeoutSeconds,
    nonce: crypto.randomUUID(), // Replay protection
    expiresAt: new Date(Date.now() + maxTimeoutSeconds * 1000).toISOString(),
  };
}

export function encodeX402Header(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64");
}

export function decodePaymentSignatureHeader(
  header: string | null,
): PaymentPayloadV2 | null {
  if (!header) return null;
  try {
    const decoded = Buffer.from(header, "base64").toString("utf-8");
    return JSON.parse(decoded) as PaymentPayloadV2;
  } catch {
    return null;
  }
}

export async function settlePayment(
  paymentPayload: PaymentPayloadV2,
  paymentRequirements: PaymentRequirementsV2,
) {
  console.log("🚀 [settlePayment] Calling facilitator...");
  console.log("📦 [settlePayment] Payment payload:", {
    x402Version: paymentPayload.x402Version,
    accepted: paymentPayload.accepted,
    payload: {
      transaction: paymentPayload.payload?.transaction?.substring(0, 40) + "...",
      transactionLength: paymentPayload.payload?.transaction?.length,
      broadcastOnSettle: (paymentPayload.payload as any)?.broadcastOnSettle,
    },
  });
  console.log("📋 [settlePayment] Payment requirements:", paymentRequirements);

  const facilitatorUrl =
    process.env.X402_FACILITATOR_URL ||
    process.env.FACILITATOR_URL ||
    "https://facilitator.stacksx402.com";
  console.log("🌐 [settlePayment] Facilitator URL:", facilitatorUrl);

  const verifier = new X402PaymentVerifier(facilitatorUrl);

  console.time("⏱️ [settlePayment] Facilitator duration");
  const result = await verifier.settle(paymentPayload, { paymentRequirements });
  console.timeEnd("⏱️ [settlePayment] Facilitator duration");

  console.log("📊 [settlePayment] Facilitator raw response:", JSON.stringify(result, null, 2));

  return result;
}
