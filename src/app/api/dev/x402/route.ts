import { NextRequest, NextResponse } from "next/server";
import { createPaymentClient, getPaymentResponseFromHeaders } from "x402-stacks";
import { getRecorderAccount } from "@/lib/app-config";

export async function POST(request: NextRequest) {
  try {
    const account = getRecorderAccount();
    if (!account) {
      return NextResponse.json(
        { error: "WALLET_PRIVATE_KEY must be configured for automation." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as { listingId?: number };
    if (!body.listingId) {
      return NextResponse.json(
        { error: "listingId is required." },
        { status: 400 },
      );
    }

    const client = createPaymentClient(account, {
      baseURL: request.nextUrl.origin,
      headers: {
        "x-buyer-wallet": account.address,
      },
    });

    const response = await client.get(`/api/agent/listings/${body.listingId}/content`);
    const payment = getPaymentResponseFromHeaders(response);

    return NextResponse.json({
      content: response.data.content,
      payment: {
        txid: payment?.transaction ?? null,
        buyer: payment?.payer ?? account.address,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to execute automated x402 flow.",
      },
      { status: 500 },
    );
  }
}
