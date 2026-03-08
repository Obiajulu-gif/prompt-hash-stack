import { NextResponse } from "next/server";
import { getMarketplaceListings } from "@/lib/server/marketplace";

export async function GET() {
  try {
    const listings = await getMarketplaceListings();
    return NextResponse.json({ listings });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load marketplace listings.",
      },
      { status: 500 },
    );
  }
}
