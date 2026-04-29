"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Star, BookOpen, RefreshCw, Loader2, SlidersHorizontal, X, Eye, FileText } from "lucide-react";
import PaginationBar from "@/components/pagination-bar";

interface Novel {
  id: string;
  title: string;
  titleZh?: string;
  platform: string;
  tags: string;
  rankingTime: string;
  score: number;
  url: string;
  cover?: string;
  views?: number;
  totalChapters?: number;
  updatedAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const PLATFORMS = [
  { value: "all", label: "全部平台" },
  { value: "RoyalRoad", label: "RoyalRoad" },
  { value: "ScribbleHub", label: "ScribbleHub" },
  { value: "Webnovel", label: "Webnovel" },
  { value: "NovelUpdates", label: "NovelUpdates" },
  { value: "Wattpad", label: "Wattpad" },
  { value: "Tapas", label: "Tapas" },
];

const RANKING_TIMES = [
  { value: "all", label: "全部" },
  { value: "today", label: "今日爆款" },
  { value: "week", label: "本周爆款" },
  { value: "month", label: "本月爆款" },
];

const SORT_OPTIONS = [
  { value: "score", label: "评分最高" },
  { value: "views", label: "阅读量" },
  { value: "updatedAt", label: "最近更新" },
  { value: "title", label: "名称排序" },
];

const PLATFORM_COLORS: Record<string, string> = {
  RoyalRoad: "bg-emerald-500",
  ScribbleHub: "bg-fuchsia-500",
  Webnovel: "bg-sky-500",
  NovelUpdates: "bg-amber-500",
  Wattpad: "bg-orange-500",
  Tapas: "bg-rose-500",
};

const RANKING_BADGE: Record<string, { label: string; cls: string }> = {
  today: { label: "今日爆款", cls: "bg-rose-500/90" },
  week: { label: "本周爆款", cls: "bg-amber-500/90" },
  month: { label: "本月爆款", cls: "bg-blue-500/90" },
};

const COVER_GRADIENTS = [
  "from-emerald-950 to-teal-900",
  "from-green-950 to-emerald-900",
  "from-teal-950 to-cyan-900",
  "from-lime-950 to-green-900",
  "from-cyan-950 to-teal-900",
  "from-emerald-900 to-green-950",
];

function getGradient(title: string) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h + title.charCodeAt(i)) % COVER_GRADIENTS.length;
  return COVER_GRADIENTS[h];
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export default function NovelsPage() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [platform, setPlatform] = useState("all");
  const [rankingTime, setRankingTime] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("score");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);

  const fetchNovels = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (platform !== "all") params.set("platform", platform);
      if (rankingTime !== "all") params.set("rankingTime", rankingTime);
      if (search) params.set("search", search);
      params.set("sort", sort);
      params.set("order", order);
      params.set("page", String(pagination.page));
      params.set("pageSize", String(pagination.pageSize));
      const res = await fetch(`/api/novels?${params.toString()}`);
      const json = await res.json();
      setNovels(json.data || []);
      setPagination(json.pagination);
    } catch (err) {
      console.error("Fetch novels failed:", err);
    } finally {
      setLoading(false);
    }
  }, [platform, rankingTime, search, sort, order, pagination.page, pagination.pageSize]);

  useEffect(() => { fetchNovels(); }, [fetchNovels]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/novels/sync", { method: "POST" });
      const json = await res.json();
      alert(json.message || `同步完成，更新 ${json.count} 条数据`);
      fetchNovels();
    } catch (err: any) {
      alert("同步失败: " + (err.message || "Unknown error"));
    } finally {
      setSyncing(false);
    }
  };

  const hasFilters = platform !== "all" || rankingTime !== "all";

  const resetFilters = () => {
    setPlatform("all");
    setRankingTime("all");
    setSearch("");
    setSort("score");
    setOrder("desc");
    setPagination((p) => ({ ...p, page: 1 }));
  };

  return (
    <div className="relative min-h-full">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-0 left-0 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.08)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute top-0 right-0 w-[400px] h-[300px] bg-[radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.05)_0%,transparent_70%)]" />

      {/* Noise overlay */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.015] z-[1]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      <div className="relative z-[2] px-8 py-7 flex flex-col gap-7" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
        {/* Page header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              小说榜单
            </h1>
            <p className="text-sm text-gray-600 mt-2 tracking-wide">
              ROYALROAD · SCRIBBLEHUB · WEBNOVEL
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="h-10 px-6 rounded-xl bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 hover:bg-emerald-400 active:scale-[0.97] transition-all disabled:opacity-50"
          >
            {syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            立即更新
          </button>
        </div>

        {/* Search & toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-[480px]">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
            <input
              type="text"
              placeholder="搜索小说..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
              className="w-full h-11 pl-11 pr-4 rounded-2xl bg-white/[0.05] border border-white/[0.07] text-sm text-gray-200 outline-none focus:border-emerald-500/40 focus:bg-white/[0.07] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.08)] transition-all placeholder:text-gray-600"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`h-11 px-5 rounded-2xl border text-sm flex items-center gap-2 transition-all ${
              showFilters || hasFilters
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-white/[0.04] border-white/[0.07] text-gray-500 hover:border-white/[0.12] hover:text-gray-400"
            }`}
          >
            <SlidersHorizontal size={15} />
            筛选
            {hasFilters && (
              <span className="min-w-[20px] h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center px-1.5">
                {(platform !== "all" ? 1 : 0) + (rankingTime !== "all" ? 1 : 0)}
              </span>
            )}
          </button>
          <select
            value={`${sort}-${order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split("-");
              setSort(s);
              setOrder(o as "asc" | "desc");
            }}
            className="h-11 px-4 pr-9 rounded-2xl bg-white/[0.04] border border-white/[0.07] text-sm text-gray-500 outline-none cursor-pointer hover:border-white/[0.12]"
          >
            {SORT_OPTIONS.map((s) => (
              <optgroup key={s.value} label={s.label}>
                <option value={`${s.value}-desc`}>{s.label} ↓</option>
                <option value={`${s.value}-asc`}>{s.label} ↑</option>
              </optgroup>
            ))}
          </select>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
            <span className="text-[10px] text-gray-600 uppercase tracking-[0.15em] font-semibold">平台</span>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => { setPlatform(p.value); setPagination((pr) => ({ ...pr, page: 1 })); }}
                  className={`h-8 px-4 rounded-full text-xs font-medium transition-all ${
                    platform === p.value
                      ? "bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      : "bg-white/[0.05] text-gray-500 hover:bg-white/[0.08] hover:text-gray-400"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="w-px h-5 bg-white/[0.06] mx-2" />
            <span className="text-[10px] text-gray-600 uppercase tracking-[0.15em] font-semibold">榜单</span>
            <div className="flex flex-wrap gap-1.5">
              {RANKING_TIMES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { setRankingTime(r.value); setPagination((pr) => ({ ...pr, page: 1 })); }}
                  className={`h-8 px-4 rounded-full text-xs font-medium transition-all ${
                    rankingTime === r.value
                      ? "bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      : "bg-white/[0.05] text-gray-500 hover:bg-white/[0.08] hover:text-gray-400"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {hasFilters && (
              <>
                <div className="w-px h-5 bg-white/[0.06] mx-2" />
                <button onClick={resetFilters} className="text-xs text-gray-600 hover:text-rose-400 flex items-center gap-1 transition-colors">
                  <X size={12} /> 清除
                </button>
              </>
            )}
          </div>
        )}

        {/* Result count */}
        <div className="flex items-center">
          <span className="text-sm text-gray-600">
            共 <strong className="text-gray-400 font-semibold">{pagination.total}</strong> 部
            {hasFilters && <> · 筛选 <strong className="text-gray-400 font-semibold">{novels.length}</strong> 部</>}
          </span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden animate-pulse bg-white/[0.02] border border-white/[0.05] flex h-[200px]">
                <div className="w-[300px] shrink-0 bg-white/[0.03]" />
                <div className="flex-1 px-8 py-6 flex flex-col gap-4">
                  <div className="flex gap-2.5"><div className="h-7 bg-white/[0.05] rounded-full w-24" /><div className="h-7 bg-white/[0.03] rounded-full w-20" /><div className="h-8 bg-white/[0.03] rounded w-16 ml-auto" /></div>
                  <div className="h-6 bg-white/[0.05] rounded w-2/3" />
                  <div className="h-5 bg-white/[0.03] rounded w-2/5" />
                  <div className="flex gap-2.5 mt-auto"><div className="h-4 bg-white/[0.03] rounded w-20" /><div className="h-4 bg-white/[0.03] rounded w-16" /><div className="h-4 bg-white/[0.03] rounded w-24 ml-auto" /></div>
                </div>
              </div>
            ))}
          </div>
        ) : novels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28">
            <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
              <BookOpen size={32} strokeWidth={1.2} className="text-gray-700" />
            </div>
            <p className="text-lg font-semibold text-gray-400 mb-1">暂无小说数据</p>
            <p className="text-sm text-gray-600">点击「立即更新」同步最新榜单</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {novels.map((novel, idx) => (
                <Link key={novel.id} href={`/novels/${novel.id}`} className="group card-animate" style={{ animationDelay: `${idx * 60}ms` }}>
                  <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-[#141419] hover:border-emerald-500/25 hover:shadow-[0_0_50px_rgba(16,185,129,0.07),0_20px_40px_rgba(0,0,0,0.3)] transition-all duration-500 flex">
                    {/* Cover */}
                    <div className="w-[300px] shrink-0 relative overflow-hidden">
                      {novel.cover ? (
                        <img src={novel.cover} alt="" className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700 ease-out" loading="lazy" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getGradient(novel.title)} flex items-center justify-center`}>
                          <BookOpen size={44} className="text-emerald-500/20" />
                        </div>
                      )}
                      {/* Cover right fade */}
                      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-[#141419]" />
                      {/* Rank badge */}
                      {idx < 3 && pagination.page === 1 && sort === "score" && (
                        <div className="absolute top-3 left-3 w-8 h-8 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center text-white text-sm font-bold rounded-xl">
                          {idx + 1}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 px-8 py-6 flex flex-col min-w-0">
                      {/* Row 1: badges + score */}
                      <div className="flex items-center gap-2.5 mb-4">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold text-white tracking-wide ${PLATFORM_COLORS[novel.platform] || "bg-gray-600"}`}>
                          {novel.platform}
                        </span>
                        {RANKING_BADGE[novel.rankingTime] && (
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold text-white tracking-wide ${RANKING_BADGE[novel.rankingTime].cls}`}>
                            {RANKING_BADGE[novel.rankingTime].label}
                          </span>
                        )}
                        <div className="flex items-center gap-2 ml-auto shrink-0">
                          <Star size={18} className="fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]" />
                          <span className="text-2xl font-extrabold text-amber-400 tabular-nums" style={{ textShadow: "0 0 20px rgba(251,191,36,0.25)" }}>
                            {novel.score.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: title */}
                      <h3 className="text-xl font-bold text-white leading-tight line-clamp-1 group-hover:text-emerald-400 transition-colors duration-300 tracking-tight">
                        {novel.title}
                      </h3>

                      {/* Row 3: chinese title */}
                      <p className="text-[15px] text-gray-500 mt-1.5 line-clamp-1">{novel.titleZh || " "}</p>

                      {/* Row 4: tags */}
                      {novel.tags && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {novel.tags.split(",").slice(0, 4).map((tag) => (
                            <span key={tag} className="text-[13px] text-emerald-400/70 bg-emerald-500/[0.07] border border-emerald-500/[0.12] px-3 py-0.5 rounded-full">
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Row 5: metadata */}
                      <div className="flex items-center gap-6 mt-auto pt-4 text-[13px] text-gray-600">
                        {novel.views != null && (
                          <span className="flex items-center gap-2">
                            <Eye size={14} className="text-gray-700" />
                            <span className="text-gray-500 tabular-nums font-medium">{formatNumber(novel.views)}</span>
                          </span>
                        )}
                        {novel.totalChapters != null && (
                          <span className="flex items-center gap-2">
                            <FileText size={14} className="text-gray-700" />
                            <span className="text-gray-500 tabular-nums font-medium">{novel.totalChapters} 章</span>
                          </span>
                        )}
                        <span className="tabular-nums ml-auto font-medium">{new Date(novel.updatedAt).toLocaleDateString("zh-CN")}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="dark-pagination" style={{ "--accent": "#10b981" } as React.CSSProperties}>
              <PaginationBar
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
