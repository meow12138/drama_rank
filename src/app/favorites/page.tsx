"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bookmark, Star, BookOpen, Clapperboard, Loader2 } from "lucide-react";
import AdminTag from "@/components/admin-tag";

interface FavoriteItem { id: string; savedAt: string; }
interface Novel { id: string; title: string; platform: string; tags: string; rankingTime: string; score: number; url: string; cover?: string; updatedAt: string; }
interface Drama { id: string; title: string; titleZh?: string; platform: string; tags: string; chartType: string; score: number; url: string; cover?: string; updatedAt: string; }

const NOVEL_PLATFORM_TAG: Record<string, "emerald" | "violet" | "sky"> = { RoyalRoad: "emerald", ScribbleHub: "violet", Webnovel: "sky" };
const DRAMA_PLATFORM_TAG: Record<string, "cyan" | "violet" | "amber" | "rose" | "orange" | "pink" | "lime" | "teal"> = {
  FlexTV: "cyan", FlickReels: "violet", NetShort: "amber", ReelShort: "rose", ShortTV: "orange", DramaBox: "pink", "Kalos TV": "lime", MobiReels: "teal",
};

function getNovelFavorites(): FavoriteItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem("novel-favorites") || "[]");
    if (raw.length > 0 && typeof raw[0] === "string") {
      const migrated = raw.map((id: string) => ({ id, savedAt: new Date().toISOString() }));
      localStorage.setItem("novel-favorites", JSON.stringify(migrated));
      return migrated;
    }
    return raw as FavoriteItem[];
  } catch { return []; }
}

function getDramaFavorites(): FavoriteItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem("drama-favorites") || "[]");
    if (raw.length > 0 && typeof raw[0] === "string") {
      const migrated = raw.map((id: string) => ({ id, savedAt: new Date().toISOString() }));
      localStorage.setItem("drama-favorites", JSON.stringify(migrated));
      return migrated;
    }
    return raw as FavoriteItem[];
  } catch { return []; }
}

function renderStars(score: number) {
  const full = Math.floor(score);
  return (
    <div className="zw-stars">
      {[...Array(5)].map((_, i) => (
        <Star key={i} size={12} className={i < full ? "fill-amber-400 text-amber-400" : "text-[rgb(242,243,245)]"} />
      ))}
      <span className="score">{score.toFixed(1)}</span>
    </div>
  );
}

export default function FavoritesPage() {
  const [tab, setTab] = useState<"novels" | "dramas">("novels");
  const [novels, setNovels] = useState<Novel[]>([]);
  const [novelFavs, setNovelFavs] = useState<FavoriteItem[]>([]);
  const [novelLoading, setNovelLoading] = useState(true);
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [dramaFavs, setDramaFavs] = useState<FavoriteItem[]>([]);
  const [dramaLoading, setDramaLoading] = useState(true);

  const fetchNovels = useCallback(async () => {
    const favs = getNovelFavorites(); setNovelFavs(favs);
    if (favs.length === 0) { setNovels([]); setNovelLoading(false); return; }
    try {
      const res = await fetch("/api/novels/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: favs.map((f) => f.id) }) });
      const json = await res.json(); setNovels(json.data || []);
    } catch {} finally { setNovelLoading(false); }
  }, []);

  const fetchDramas = useCallback(async () => {
    const favs = getDramaFavorites(); setDramaFavs(favs);
    if (favs.length === 0) { setDramas([]); setDramaLoading(false); return; }
    try {
      const res = await fetch("/api/dramas/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: favs.map((f) => f.id) }) });
      const json = await res.json(); setDramas(json.data || []);
    } catch {} finally { setDramaLoading(false); }
  }, []);

  useEffect(() => { fetchNovels(); fetchDramas(); }, [fetchNovels, fetchDramas]);

  const removeNovelFavorite = (id: string) => {
    const next = novelFavs.filter((f) => f.id !== id);
    localStorage.setItem("novel-favorites", JSON.stringify(next));
    setNovelFavs(next); setNovels((prev) => prev.filter((n) => n.id !== id));
  };

  const removeDramaFavorite = (id: string) => {
    const next = dramaFavs.filter((f) => f.id !== id);
    localStorage.setItem("drama-favorites", JSON.stringify(next));
    setDramaFavs(next); setDramas((prev) => prev.filter((d) => d.id !== id));
  };

  const getSavedAt = (favs: FavoriteItem[], id: string) => {
    const item = favs.find((f) => f.id === id);
    return item ? new Date(item.savedAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "--";
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 标签切换 */}
      <div className="zw-card">
        <div className="zw-card-body flex items-center gap-2">
          <button
            onClick={() => setTab("novels")}
            className={`zw-btn ${tab === "novels" ? "zw-btn-primary" : "zw-btn-default"}`}
          >
            <BookOpen size={14} /> 小说收藏 ({novelFavs.length})
          </button>
          <button
            onClick={() => setTab("dramas")}
            className={`zw-btn ${tab === "dramas" ? "zw-btn-primary" : "zw-btn-default"}`}
          >
            <Clapperboard size={14} /> 短剧收藏 ({dramaFavs.length})
          </button>
          <span style={{ marginLeft: "auto", fontSize: 13, color: "#86909c" }}>
            共 {novelFavs.length + dramaFavs.length} 部收藏
          </span>
        </div>
      </div>

      {/* 表格 */}
      <div className="zw-card">
        <div className="zw-card-body">
          {tab === "novels" && (
            novelLoading ? (
              <div className="zw-empty" style={{ padding: "80px 0" }}><Loader2 size={24} className="zw-spin" /></div>
            ) : novels.length === 0 ? (
              <div className="zw-empty" style={{ padding: "80px 0" }}>
                <Bookmark size={40} />
                <p>暂无收藏小说</p>
                <Link href="/novels" className="zw-btn-text" style={{ marginTop: 8 }}>去小说榜单发现热门作品</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="zw-table" style={{ minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th>名称</th>
                      <th className="center" style={{ width: 100 }}>平台</th>
                      <th className="center" style={{ width: 130 }}>评分</th>
                      <th className="center" style={{ width: 140 }}>收藏时间</th>
                      <th className="center" style={{ width: 120 }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {novels.map((novel) => (
                      <tr key={novel.id}>
                        <td>
                          <Link href={`/novels/${novel.id}`} className="text-link" style={{ fontWeight: 500 }}>{novel.title}</Link>
                        </td>
                        <td className="center">
                          <AdminTag color={NOVEL_PLATFORM_TAG[novel.platform] || "gray"}>{novel.platform}</AdminTag>
                        </td>
                        <td className="center">{renderStars(novel.score)}</td>
                        <td className="center" style={{ color: "#86909c" }}>{getSavedAt(novelFavs, novel.id)}</td>
                        <td className="center">
                          <Link href={`/novels/${novel.id}`} className="zw-btn-text">查看</Link>
                          <button onClick={() => removeNovelFavorite(novel.id)} className="zw-btn-danger-text">删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {tab === "dramas" && (
            dramaLoading ? (
              <div className="zw-empty" style={{ padding: "80px 0" }}><Loader2 size={24} className="zw-spin" /></div>
            ) : dramas.length === 0 ? (
              <div className="zw-empty" style={{ padding: "80px 0" }}>
                <Bookmark size={40} />
                <p>暂无收藏短剧</p>
                <Link href="/dramas" className="zw-btn-text" style={{ marginTop: 8 }}>去短剧监控发现热门短剧</Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="zw-table" style={{ minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th>名称</th>
                      <th className="center" style={{ width: 100 }}>平台</th>
                      <th className="center" style={{ width: 130 }}>评分</th>
                      <th className="center" style={{ width: 140 }}>收藏时间</th>
                      <th className="center" style={{ width: 120 }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dramas.map((drama) => (
                      <tr key={drama.id}>
                        <td>
                          <Link href={`/dramas/${drama.id}`} className="text-link" style={{ fontWeight: 500 }}>
                            {drama.title}{drama.titleZh && <span style={{ color: "#86909c", fontWeight: 400, marginLeft: 4 }}>({drama.titleZh})</span>}
                          </Link>
                        </td>
                        <td className="center">
                          <AdminTag color={DRAMA_PLATFORM_TAG[drama.platform] || "gray"}>{drama.platform}</AdminTag>
                        </td>
                        <td className="center">{renderStars(drama.score)}</td>
                        <td className="center" style={{ color: "#86909c" }}>{getSavedAt(dramaFavs, drama.id)}</td>
                        <td className="center">
                          <Link href={`/dramas/${drama.id}`} className="zw-btn-text">查看</Link>
                          <button onClick={() => removeDramaFavorite(drama.id)} className="zw-btn-danger-text">删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
