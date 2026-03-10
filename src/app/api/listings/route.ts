import { NextResponse } from "next/server";
import { hasContractAddress } from "@/lib/app-config";
import { getLocalDraftListings, getMarketplaceListings } from "@/lib/server/marketplace";

export async function GET() {
  try {
    if (!hasContractAddress()) {
      const listings = await getLocalDraftListings();
      return NextResponse.json({
        listings,
        requiresConfiguration: true,
        unavailableReason:
          "Marketplace contract is not configured, so Browse is showing locally saved prompts only.",
      });
    }

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
