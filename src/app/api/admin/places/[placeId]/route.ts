import { getAdminPlaceByIdFromSupabase } from "@/lib/place-repository";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ placeId: string }> }
) {
  try {
    const { placeId } = await context.params;
    const place = await getAdminPlaceByIdFromSupabase(placeId);

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
