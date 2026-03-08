import assert from "node:assert/strict";
import test from "node:test";
import { parsePaymentRequiredHeader } from "x402-stacks";
import { buildPaymentRequiredResponse, encodeX402Header } from "../src/lib/x402";

const VALID_TESTNET_ADDRESS = "ST16K4ZYM14WPG9GZQ5BPXNQAEVTJPRMA4VWJCXYY";

test("buildPaymentRequiredResponse returns a v2-compatible 402 payload", () => {
  process.env.NETWORK = "testnet";

  const paymentRequired = buildPaymentRequiredResponse({
    resourceUrl: "https://example.com/api/prompts/123/content",
    description: 'Unlock premium content for "Test Prompt"',
    amountBaseUnits: "500000",
    currency: "STX",
    payTo: VALID_TESTNET_ADDRESS,
  });

  assert.equal(paymentRequired.x402Version, 2);
  assert.equal(paymentRequired.error, "Payment required");
  assert.equal(
    paymentRequired.resource.url,
    "https://example.com/api/prompts/123/content",
  );
  assert.equal(paymentRequired.accepts.length, 1);

  const option = paymentRequired.accepts[0];
  assert.equal(option.scheme, "exact");
  assert.match(option.network, /^stacks:\d+$/);
  assert.match(option.amount, /^[1-9]\d*$/);
  assert.equal(option.asset, "STX");
  assert.equal(option.payTo, VALID_TESTNET_ADDRESS);
  assert.equal(option.maxTimeoutSeconds, 300);

  const encodedHeader = encodeX402Header(paymentRequired);
  const decodedHeader = parsePaymentRequiredHeader(encodedHeader);
  assert.deepEqual(decodedHeader, paymentRequired);
});

test("decimal STX amounts are normalized to atomic base units", () => {
  process.env.NETWORK = "testnet";

  const paymentRequired = buildPaymentRequiredResponse({
    resourceUrl: "https://example.com/api/prompts/decimal/content",
    description: "Decimal amount normalization",
    amountBaseUnits: "0.1",
    currency: "STX",
    payTo: VALID_TESTNET_ADDRESS,
  });

  assert.equal(paymentRequired.accepts[0]?.amount, "100000");
});
