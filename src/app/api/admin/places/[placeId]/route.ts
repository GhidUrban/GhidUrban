import { getAdminPlaceByIdFromSupabase } from "@/lib/place-repository";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ placeId: string }> }
) {
  try {
    const { placeId } = await context.params;
    const url = new URL(request.url);
    const citySlug = url.searchParams.get("city_slug")?.trim() ?? "";
    const categorySlug = url.searchParams.get("category_slug")?.trim() ?? "";
    const scope =
      citySlug && categorySlug
        ? { city_slug: citySlug, category_slug: categorySlug }
        : undefined;
    const place = await getAdminPlaceByIdFromSupabase(placeId, scope);

    if (!place) {
      return NextResponse.json(
        {
          success: false,
          message: "Place not found",
          data: null,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Admin place fetched successfully",
      data: place,
    });
  } catch (error) {
    console.error("Failed to fetch admin place", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch admin place",
        data: null,
      },
      { status: 500 }
    );
  }
}
