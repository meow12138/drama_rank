import { NextResponse } from "next/server";
import { runScraper } from "@/scripts/drama-scraper";
import { prisma } from "@/lib/db";

export async function POST() {
  const startedAt = new Date();
  try {
    const result = await runScraper();
    const finishedAt = new Date();

    if (result.platformResults) {
      for (const [platform, info] of Object.entries(result.platformResults)) {
        await prisma.syncLog.create({
          data: {
            category: "drama",
            platform,
            count: info.count,
            status: info.status === "ok" ? "ok" : "error",
            errorMsg: info.status !== "ok" ? info.status : null,
            finishedAt,
          },
        });
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    await prisma.syncLog.create({
      data: {
        category: "drama",
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
