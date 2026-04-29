import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const novels = body.novels || [];

    if (!Array.isArray(novels) || novels.length === 0) {
      return NextResponse.json(
        { error: "novels array is required" },
        { status: 400 }
      );
    }

    let upserted = 0;
    for (const novel of novels) {
      await prisma.novel.upsert({
        where: { url: novel.url },
        update: {
          title: novel.title,
          platform: novel.platform,
          tags: novel.tags || "",
          rankingTime: novel.rankingTime || "week",
          score: novel.score || 0,
          cover: novel.cover,
          description: novel.description,
        },
        create: {
          title: novel.title,
          platform: novel.platform,
          tags: novel.tags || "",
          rankingTime: novel.rankingTime || "week",
          score: novel.score || 0,
          url: novel.url,
          cover: novel.cover,
          description: novel.description,
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
