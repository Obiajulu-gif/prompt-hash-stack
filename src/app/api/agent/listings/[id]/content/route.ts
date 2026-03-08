import { NextRequest, NextResponse } from "next/server";
import {
  buildPaymentRequiredResponse,
  buildPaymentRequirements,
  decodePaymentSignatureHeader,
  encodeX402Header,
  settlePayment,
  X402_HEADERS,
} from "@/lib/x402";
import { getListingWithDraft, hasListingAccess, recordX402PurchaseOnChain } from "@/lib/server/marketplace";
import { waitForTransaction } from "@/lib/server/hiro";

function responseWithX402Headers(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Vary", `${X402_HEADERS.PAYMENT_SIGNATURE}, x-buyer-wallet`);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const listingId = Number.parseInt(id, 10);
    if (!Number.isFinite(listingId)) {
      return NextResponse.json({ error: "Invalid listing id." }, { status: 400 });
    }

    const result = await getListingWithDraft(listingId);
    if (!result?.listing || !result.draft) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }

    const { draft, listing } = result;
    const buyerWallet = request.headers.get("x-buyer-wallet")?.trim() || "";

    if (buyerWallet && (await hasListingAccess(listing.id, buyerWallet))) {
      const response = NextResponse.json({ content: draft.premiumContent });
      responseWithX402Headers(response);
      return response;
    }

    if (!listing.x402Enabled) {
      return NextResponse.json(
        { error: "x402 access is disabled for this listing." },
        { status: 400 },
      );
    }

    const paymentRequired = buildPaymentRequiredResponse({
      resourceUrl: request.url,
      description: `Unlock premium content for ${listing.title}`,
      amountBaseUnits: listing.priceAtomic,
      currency: listing.asset,
      payTo: listing.seller,
    });

    const paymentHeader = request.headers.get(X402_HEADERS.PAYMENT_SIGNATURE);
    if (!paymentHeader) {
      const response = NextResponse.json(paymentRequired, { status: 402 });
      response.headers.set(
        X402_HEADERS.PAYMENT_REQUIRED,
        encodeX402Header(paymentRequired),
      );
      responseWithX402Headers(response);
      return response;
    }

    const paymentPayload = decodePaymentSignatureHeader(paymentHeader);
    if (!paymentPayload) {
      return NextResponse.json(
        { error: "Invalid payment-signature header." },
        { status: 400 },
      );
    }

    const paymentRequirements = buildPaymentRequirements({
      amountBaseUnits: listing.priceAtomic,
      currency: listing.asset,
      payTo: listing.seller,
    });

    const settlement = await settlePayment(paymentPayload, paymentRequirements);
    if (!settlement.success || !settlement.payer) {
      const response = NextResponse.json(
        {
          error: settlement.errorReason || "Payment settlement failed.",
          transaction: settlement.transaction,
        },
        { status: 402 },
      );
      responseWithX402Headers(response);
      return response;
    }

    if (!(await hasListingAccess(listing.id, settlement.payer))) {
      const recordTxId = await recordX402PurchaseOnChain(
        listing.id,
        settlement.payer,
        settlement.transaction,
      );
      const recordTx = await waitForTransaction(recordTxId);
      if (recordTx.tx_status !== "success") {
        throw new Error(
          `x402 access record transaction failed with status ${recordTx.tx_status}.`,
        );
      }
    }

    const response = NextResponse.json({
      content: draft.premiumContent,
      payment: {
        payer: settlement.payer,
        transaction: settlement.transaction,
      },
    });
    response.headers.set(
      X402_HEADERS.PAYMENT_RESPONSE,
      encodeX402Header({
        payer: settlement.payer,
        transaction: settlement.transaction,
        network: settlement.network,
        success: settlement.success,
      }),
    );
    responseWithX402Headers(response);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to unlock content.",
      },
      { status: 500 },
    );
  }
}
