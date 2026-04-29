import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, ExternalLink, Calendar, Tag, Clapperboard, Globe } from "lucide-react";
import { prisma } from "@/lib/db";
import AdminTag from "@/components/admin-tag";
import FavoriteButton from "./favorite-button";

const PLATFORM_TAG: Record<string, "cyan" | "violet" | "amber" | "rose" | "orange" | "pink" | "lime" | "teal"> = {
  FlexTV: "cyan", FlickReels: "violet", NetShort: "amber", ReelShort: "rose",
  ShortTV: "orange", DramaBox: "pink", "Kalos TV": "lime", MobiReels: "teal",
};
const CHART_TAG: Record<string, { label: string; color: "red" | "emerald" }> = {
  hot: { label: "近期热剧", color: "red" },
  rising: { label: "新剧飙升", color: "emerald" },
};

async function getDrama(id: string) {
  try { return await prisma.drama.findUnique({ where: { id } }); } catch { return null; }
}

export default async function DramaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const drama = await getDrama(id);
  if (!drama) notFound();

  const fullStars = Math.floor(drama.score);
  const hasHalf = drama.score - fullStars >= 0.5;

  return (
    <div className="flex flex-col gap-4">
      {/* 基本信息 */}
      <div className="zw-card">
        <div className="zw-card-body" style={{ padding: 24 }}>
          <div className="flex gap-5">
            {drama.cover ? (
              <img src={drama.cover} alt={drama.title} className="w-28 h-40 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-28 h-40 rounded-lg bg-zw-table-header flex items-center justify-center shrink-0">
                <Clapperboard size={32} className="text-zw-text-secondary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-zw-text mb-1">
                {drama.title}
                {drama.titleZh && <span className="ml-2 text-lg font-normal text-zw-text-secondary">({drama.titleZh})</span>}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <AdminTag color={PLATFORM_TAG[drama.platform] || "gray"}>
                  <Globe size={12} className="mr-1" />{drama.platform}
                </AdminTag>
                {CHART_TAG[drama.chartType] ? (
                  <AdminTag color={CHART_TAG[drama.chartType].color}>{CHART_TAG[drama.chartType].label}</AdminTag>
                ) : (
                  <AdminTag>{drama.chartType}</AdminTag>
                )}
              </div>
              <div className="flex items-center gap-2 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} className={i < fullStars ? "fill-amber-400 text-amber-400" : i === fullStars && hasHalf ? "fill-amber-400/50 text-amber-400" : "text-[rgb(242,243,245)]"} />
                ))}
                <span className="text-lg font-bold text-zw-text ml-1">{drama.score.toFixed(1)}</span>
              </div>
              {drama.tags && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag size={14} className="text-zw-text-secondary" />
                  {drama.tags.split(",").map((tag) => (
                    <span key={tag} className="px-2 py-0.5 text-xs rounded bg-zw-table-header text-zw-text-secondary">{tag.trim()}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 剧情简介 */}
      <div className="zw-card">
        <div className="zw-card-header">
          <span className="zw-card-title">剧情简介</span>
        </div>
        <div className="zw-card-body">
          {drama.description ? (
            <p style={{ fontSize: 13, lineHeight: 1.8, color: "#86909c" }}>{drama.description}</p>
          ) : (
            <p style={{ fontSize: 13, color: "#86909c" }}>暂无简介</p>
          )}
          {drama.descriptionZh && (
            <div className="mt-4 rounded border-l-4 border-zw-primary bg-zw-primary-bg p-4">
              <p style={{ fontSize: 13, fontWeight: 500, color: "#00bf8a", marginBottom: 4 }}>中文翻译</p>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: "#323335" }}>{drama.descriptionZh}</p>
            </div>
          )}
        </div>
      </div>

      {/* 信息 + 操作 */}
      <div className="zw-card">
        <div className="zw-card-header">
          <span className="zw-card-title">详细信息</span>
        </div>
        <div className="zw-card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5" style={{ fontSize: 13 }}>
            <div className="flex items-center gap-2 text-zw-text-secondary">
              <Calendar size={14} /> 更新于: {new Date(drama.updatedAt).toLocaleDateString("zh-CN")}
            </div>
            <div className="flex items-center gap-2 text-zw-text-secondary">
              <Globe size={14} /> 来源:
              <a href={drama.url} target="_blank" rel="noopener noreferrer" className="zw-btn-text" style={{ padding: 0 }}>{drama.platform}</a>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={drama.url} target="_blank" rel="noopener noreferrer" className="zw-btn zw-btn-primary">
              <ExternalLink size={14} /> 前往观看
            </a>
            <FavoriteButton dramaId={drama.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
