import { NextResponse } from "next/server";
import { runScraper } from "@/scripts/novel-scraper";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    const result = await runScraper();
    const finishedAt = new Date();

    await prisma.syncLog.create({
      data: {
        category: "novel",
        platform: "all",
        count: result.count,
        status: result.count > 0 ? "ok" : "error",
        errorMsg: result.count === 0 ? "No data scraped" : null,
        finishedAt,
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    await prisma.syncLog.create({
      data: {
        category: "novel",
        platform: "all",
        count: 0,
        status: "error",
        errorMsg: error.message || "Unknown error",
        finishedAt: new Date(),
      },
    });
    return NextResponse.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    );
  }
}
