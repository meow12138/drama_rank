import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Star, Tag, BookOpen, Globe, Calendar } from "lucide-react";
import { prisma } from "@/lib/db";
import AdminTag from "@/components/admin-tag";
import FavoriteButton from "./favorite-button";

const PLATFORM_TAG: Record<string, "emerald" | "violet" | "sky"> = {
  RoyalRoad: "emerald", ScribbleHub: "violet", Webnovel: "sky",
};
const RANKING_TAG: Record<string, { label: string; color: "red" | "amber" | "blue" }> = {
  today: { label: "今日爆款", color: "red" },
  week: { label: "本周爆款", color: "amber" },
  month: { label: "本月爆款", color: "blue" },
};

async function getNovel(id: string) {
  try { return await prisma.novel.findUnique({ where: { id } }); } catch { return null; }
}

export default async function NovelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const novel = await getNovel(id);
  if (!novel) notFound();

  const fullStars = Math.floor(novel.score);
  const hasHalf = novel.score - fullStars >= 0.5;

  return (
    <div className="flex flex-col gap-4">
      {/* 基本信息 */}
      <div className="zw-card">
        <div className="zw-card-body" style={{ padding: 24 }}>
          <div className="flex gap-5">
            {novel.cover ? (
              <img src={novel.cover} alt={novel.title} className="w-28 h-40 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-28 h-40 rounded-lg bg-zw-table-header flex items-center justify-center shrink-0">
                <BookOpen size={32} className="text-zw-text-secondary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-zw-text mb-3">{novel.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <AdminTag color={PLATFORM_TAG[novel.platform] || "gray"}>
                  <Globe size={12} className="mr-1" />{novel.platform}
                </AdminTag>
                {RANKING_TAG[novel.rankingTime] ? (
                  <AdminTag color={RANKING_TAG[novel.rankingTime].color}>{RANKING_TAG[novel.rankingTime].label}</AdminTag>
                ) : (
                  <AdminTag>{novel.rankingTime}</AdminTag>
                )}
              </div>
              <div className="flex items-center gap-2 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} className={i < fullStars ? "fill-amber-400 text-amber-400" : i === fullStars && hasHalf ? "fill-amber-400/50 text-amber-400" : "text-[rgb(242,243,245)]"} />
                ))}
                <span className="text-lg font-bold text-zw-text ml-1">{novel.score.toFixed(1)}</span>
                <span style={{ fontSize: 13, color: "#86909c" }}>爆款评分</span>
              </div>
              {novel.tags && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag size={14} className="text-zw-text-secondary" />
                  {novel.tags.split(",").map((tag) => (
                    <span key={tag} className="px-2 py-0.5 text-xs rounded bg-zw-table-header text-zw-text-secondary">{tag.trim()}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 简介 */}
      {novel.description && (
        <div className="zw-card">
          <div className="zw-card-header">
            <span className="zw-card-title">作品简介</span>
          </div>
          <div className="zw-card-body">
            <p style={{ fontSize: 13, lineHeight: 1.8, color: "#86909c" }}>{novel.description}</p>
          </div>
        </div>
      )}

      {/* 元信息 + 操作 */}
      <div className="zw-card">
        <div className="zw-card-header">
          <span className="zw-card-title">详细信息</span>
        </div>
        <div className="zw-card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5" style={{ fontSize: 13 }}>
            <div className="flex items-center gap-2 text-zw-text-secondary">
              <Calendar size={14} /> 首次收录: {new Date(novel.createdAt).toLocaleDateString("zh-CN")}
            </div>
            <div className="flex items-center gap-2 text-zw-text-secondary">
              <Calendar size={14} /> 最后更新: {new Date(novel.updatedAt).toLocaleDateString("zh-CN")}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={novel.url} target="_blank" rel="noopener noreferrer" className="zw-btn zw-btn-primary">
              <ExternalLink size={14} /> 前往源站阅读
            </a>
            <FavoriteButton novelId={novel.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
