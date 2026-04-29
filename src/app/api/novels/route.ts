import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const platform = searchParams.get("platform");
  const rankingTime = searchParams.get("rankingTime");
  const tag = searchParams.get("tag");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "score";
  const order = searchParams.get("order") || "desc";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

  const skip = (page - 1) * pageSize;

  const where: any = {};

  if (platform && platform !== "all") {
    where.platform = platform;
  }

  if (rankingTime && rankingTime !== "all") {
    where.rankingTime = rankingTime;
  }

  if (tag && tag !== "all") {
    where.tags = { contains: tag };
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { titleZh: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const orderBy: any = {};
  if (sort === "score") {
    orderBy.score = order;
  } else if (sort === "title") {
    orderBy.title = order;
  } else if (sort === "updatedAt") {
    orderBy.updatedAt = order;
  } else if (sort === "views") {
    orderBy.views = order;
  } else {
    orderBy.score = "desc";
  }

  const [novels, total] = await Promise.all([
    prisma.novel.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.novel.count({ where }),
  ]);

  return NextResponse.json({
    data: novels,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
