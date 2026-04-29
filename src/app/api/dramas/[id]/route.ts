import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const drama = await prisma.drama.findUnique({
      where: { id },
    });

    if (!drama) {
      return NextResponse.json({ error: "Drama not found" }, { status: 404 });
    }

    return NextResponse.json(drama);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Fetch failed" },
      { status: 500 }
    );
  }
}
