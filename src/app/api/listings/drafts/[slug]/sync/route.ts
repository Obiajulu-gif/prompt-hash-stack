import { NextRequest, NextResponse } from "next/server";
import {
  syncDraftAfterCreate,
  syncDraftAfterPublish,
} from "@/lib/server/marketplace";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const body = (await request.json()) as {
      createTxId?: string;
      publishTxId?: string;
    };

    if (body.createTxId?.trim()) {
      const draft = await syncDraftAfterCreate(slug, body.createTxId.trim());
      return NextResponse.json({ draft });
    }

    if (body.publishTxId?.trim()) {
      const draft = await syncDraftAfterPublish(slug, body.publishTxId.trim());
      return NextResponse.json({ draft });
    }

    return NextResponse.json(
      { error: "createTxId or publishTxId is required." },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to sync the listing draft.",
      },
      { status: 500 },
    );
  }
}
