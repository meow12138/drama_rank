import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dramas = body.dramas || [];

    if (!Array.isArray(dramas) || dramas.length === 0) {
      return NextResponse.json(
        { error: "dramas array is required" },
        { status: 400 }
      );
    }

    let upserted = 0;
    for (const drama of dramas) {
      await prisma.drama.upsert({
        where: { url: drama.url },
        update: {
          title: drama.title,
          platform: drama.platform,
          tags: drama.tags || "",
          chartType: drama.chartType || "hot",
          score: drama.score || 0,
          cover: drama.cover,
          description: drama.description,
        },
        create: {
          title: drama.title,
          platform: drama.platform,
          tags: drama.tags || "",
          chartType: drama.chartType || "hot",
          score: drama.score || 0,
          url: drama.url,
          cover: drama.cover,
          description: drama.description,
        },
      });
      upserted++;
    }

    return NextResponse.json({ count: upserted, message: "Import success" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Import failed" },
      { status: 500 }
    );
  }
}
