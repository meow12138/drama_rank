import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids = body.ids || [];

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const dramas = await prisma.drama.findMany({
      where: { id: { in: ids } },
      orderBy: { score: "desc" },
    });

    return NextResponse.json({ data: dramas });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Fetch failed" },
      { status: 500 }
    );
  }
}
