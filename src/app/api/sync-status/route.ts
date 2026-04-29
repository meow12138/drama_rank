import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const latestLogs = await prisma.syncLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const byPlatform = new Map<
      string,
      { category: string; platform: string; count: number; status: string; errorMsg: string | null; finishedAt: Date }
    >();
    for (const log of latestLogs) {
      const key = `${log.category}:${log.platform}`;
      if (!byPlatform.has(key)) {
        byPlatform.set(key, {
          category: log.category,
          platform: log.platform,
          count: log.count,
          status: log.status,
          errorMsg: log.errorMsg,
          finishedAt: log.finishedAt,
        });
      }
    }

    const lastSync =
      latestLogs.length > 0 ? latestLogs[0].finishedAt.toISOString() : null;
    const nextSync = lastSync
      ? new Date(
          new Date(lastSync).getTime() + 2 * 60 * 60 * 1000
        ).toISOString()
      : null;

    return NextResponse.json({
      lastSyncTime: lastSync,
      nextSyncTime: nextSync,
      syncInterval: "2h",
      platforms: Object.fromEntries(byPlatform),
      recentLogs: latestLogs.slice(0, 30),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch sync status" },
      { status: 500 }
    );
  }
}
