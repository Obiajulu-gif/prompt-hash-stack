import { NextRequest, NextResponse } from "next/server";
import { getOwnedMarketplaceListings } from "@/lib/server/marketplace";

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get("address")?.trim() || "";
    if (!address) {
      return NextResponse.json(
        { error: "address query parameter is required." },
        { status: 400 },
      );
    }

    const listings = await getOwnedMarketplaceListings(address);
    return NextResponse.json({ listings });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load owned listings.",
      },
      { status: 500 },
    );
  }
}
