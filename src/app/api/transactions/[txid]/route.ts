import { NextResponse } from "next/server";
import { transactionSummary } from "@/lib/server/marketplace";
import { getTransaction, isTransactionPending } from "@/lib/server/hiro";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ txid: string }> },
) {
  try {
    const { txid } = await params;
    const tx = await getTransaction(txid);
    const summary = transactionSummary(tx);
    return NextResponse.json({
      status: isTransactionPending(tx) ? "pending" : summary.status,
      txResult: summary.txResult,
      error: summary.error,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        txResult: null,
        error:
          error instanceof Error ? error.message : "Failed to fetch transaction.",
      },
      { status: 500 },
    );
  }
}
