"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Clapperboard, Bookmark, Clock, Star } from "lucide-react";
import AdminTag from "@/components/admin-tag";
import SyncStatusPanel from "@/components/sync-status-panel";

interface Novel {
  id: string;
  title: string;
  platform: string;
  score: number;
  updatedAt: string;
}

interface Drama {
  id: string;
  title: string;
  titleZh?: string;
  platform: string;
  score: number;
  updatedAt: string;
}

const NOVEL_PLATFORM_TAG: Record<string, "emerald" | "violet" | "sky"> = {
  RoyalRoad: "emerald",
  ScribbleHub: "violet",
  Webnovel: "sky",
};

const DRAMA_PLATFORM_TAG: Record<string, "cyan" | "violet" | "amber" | "rose" | "orange" | "pink" | "lime" | "teal"> = {
  FlexTV: "cyan",
  FlickReels: "violet",
  NetShort: "amber",
  ReelShort: "rose",
  ShortTV: "orange",
  DramaBox: "pink",
  "Kalos TV": "lime",
  MobiReels: "teal",
};

function renderStars(score: number) {
  const full = Math.floor(score);
  return (
    <div className="zw-stars">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={12}
          className={i < full ? "fill-amber-400 text-amber-400" : "text-[rgb(242,243,245)]"}
        />
      ))}
      <span className="score">{score.toFixed(1)}</span>
    </div>
  );
}

export default function HomePage() {
  const [novelCount, setNovelCount] = useState(0);
  const [dramaCount, setDramaCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [recentNovels, setRecentNovels] = useState<Novel[]>([]);
  const [recentDramas, setRecentDramas] = useState<Drama[]>([]);

  useEffect(() => {
    fetch("/api/novels?pageSize=5&sort=updatedAt&order=desc")
      .then((r) => r.json())
      .then((json) => {
        setNovelCount(json.pagination?.total || 0);
        setRecentNovels(json.data || []);
      })
      .catch(() => {});

    fetch("/api/dramas?pageSize=5&sort=updatedAt&order=desc")
      .then((r) => r.json())
      .then((json) => {
        setDramaCount(json.pagination?.total || 0);
        setRecentDramas(json.data || []);
      })
      .catch(() => {});

    try {
      const nf = JSON.parse(localStorage.getItem("novel-favorites") || "[]");
      const df = JSON.parse(localStorage.getItem("drama-favorites") || "[]");
      setFavCount(nf.length + df.length);
    } catch {}
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "小说总数", value: novelCount, icon: BookOpen, iconBg: "bg-[#e8f3ff]", iconColor: "text-zw-info" },
          { label: "短剧总数", value: dramaCount, icon: Clapperboard, iconBg: "bg-[#fff1f2]", iconColor: "text-[#e11d48]" },
          { label: "收藏数量", value: favCount, icon: Bookmark, iconBg: "bg-[#fff7e8]", iconColor: "text-zw-warning" },
          { label: "数据更新", value: "实时", icon: Clock, iconBg: "bg-zw-primary-bg", iconColor: "text-zw-primary" },
        ].map((item) => (
          <div key={item.label} className="zw-card">
            <div className="zw-card-body">
              <div className="zw-stat-inner">
                <div>
                  <div className="zw-stat-label">{item.label}</div>
                  <div className="zw-stat-value">{item.value}</div>
                </div>
                <div className={`zw-stat-icon ${item.iconBg} ${item.iconColor}`}>
                  <item.icon size={24} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 最近更新 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* 小说 */}
        <div className="zw-card">
          <div className="zw-card-header">
            <span className="zw-card-title">最近更新小说</span>
            <Link href="/novels" className="zw-btn-text">查看全部</Link>
          </div>
          <div className="zw-card-body">
            <div className="overflow-x-auto">
              <table className="zw-table">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th className="center" style={{ width: 90 }}>平台</th>
                    <th className="center" style={{ width: 120 }}>评分</th>
                    <th className="center" style={{ width: 100 }}>更新时间</th>
                  </tr>
                </thead>
                <tbody>
                  {recentNovels.map((n) => (
                    <tr key={n.id}>
                      <td>
                        <Link href={`/novels/${n.id}`} className="text-link">
                          {n.title}
                        </Link>
                      </td>
                      <td className="center">
                        <AdminTag color={NOVEL_PLATFORM_TAG[n.platform] || "gray"}>{n.platform}</AdminTag>
                      </td>
                      <td className="center">{renderStars(n.score)}</td>
                      <td className="center" style={{ color: "#86909c" }}>
                        {new Date(n.updatedAt).toLocaleDateString("zh-CN")}
                      </td>
                    </tr>
                  ))}
                  {recentNovels.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <div className="zw-empty"><p>暂无数据</p></div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 短剧 */}
        <div className="zw-card">
          <div className="zw-card-header">
            <span className="zw-card-title">最近更新短剧</span>
            <Link href="/dramas" className="zw-btn-text">查看全部</Link>
          </div>
          <div className="zw-card-body">
            <div className="overflow-x-auto">
              <table className="zw-table">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th className="center" style={{ width: 90 }}>平台</th>
                    <th className="center" style={{ width: 120 }}>评分</th>
                    <th className="center" style={{ width: 100 }}>更新时间</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDramas.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <Link href={`/dramas/${d.id}`} className="text-link">
                          {d.title}
                          {d.titleZh && <span style={{ color: "#86909c", marginLeft: 4 }}>({d.titleZh})</span>}
                        </Link>
                      </td>
                      <td className="center">
                        <AdminTag color={DRAMA_PLATFORM_TAG[d.platform] || "gray"}>{d.platform}</AdminTag>
                      </td>
                      <td className="center">{renderStars(d.score)}</td>
                      <td className="center" style={{ color: "#86909c" }}>
                        {new Date(d.updatedAt).toLocaleDateString("zh-CN")}
                      </td>
                    </tr>
                  ))}
                  {recentDramas.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <div className="zw-empty"><p>暂无数据</p></div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 实时监控面板 */}
      <div className="mt-5">
        <SyncStatusPanel />
      </div>
    </div>
  );
}
