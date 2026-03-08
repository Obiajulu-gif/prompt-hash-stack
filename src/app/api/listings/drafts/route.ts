import { NextRequest, NextResponse } from "next/server";
import { metadataUriFromSlug } from "@/lib/marketplace";
import { createDraft, listDraftsBySeller } from "@/lib/server/drafts";

function readQuerySeller(request: NextRequest) {
  return request.nextUrl.searchParams.get("seller")?.trim() || "";
}

export async function GET(request: NextRequest) {
  try {
    const seller = readQuerySeller(request);
    if (!seller) {
      return NextResponse.json(
        { error: "seller query parameter is required." },
        { status: 400 },
      );
    }

    const drafts = await listDraftsBySeller(seller);
    return NextResponse.json({ drafts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load seller drafts.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      seller?: string;
      title?: string;
      summary?: string;
      category?: string;
      premiumContent?: string;
    };

    if (!body.seller?.trim()) {
      return NextResponse.json({ error: "seller is required." }, { status: 400 });
    }
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title is required." }, { status: 400 });
    }
    if (!body.summary?.trim()) {
      return NextResponse.json({ error: "summary is required." }, { status: 400 });
    }
    if (!body.premiumContent?.trim()) {
      return NextResponse.json(
        { error: "premiumContent is required." },
        { status: 400 },
      );
    }

    const draft = await createDraft({
      seller: body.seller.trim(),
      title: body.title.trim(),
      summary: body.summary.trim(),
      category: body.category?.trim() || "Agent service",
      premiumContent: body.premiumContent.trim(),
    });

    return NextResponse.json({
      draft,
      metadataUri: metadataUriFromSlug(draft.slug),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create listing draft.",
      },
      { status: 500 },
    );
  }
}
