import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const novel = await prisma.novel.findUnique({
      where: { id },
    });

    if (!novel) {
      return NextResponse.json({ error: "Novel not found" }, { status: 404 });
    }

    return NextResponse.json(novel);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Fetch failed" },
      { status: 500 }
    );
  }
}
