"use client";

import { useState, useEffect } from "react";
import { Activity, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

interface PlatformStatus {
  category: string;
  platform: string;
  count: number;
  status: string;
  errorMsg: string | null;
  finishedAt: string;
}

interface SyncStatusData {
  lastSyncTime: string | null;
  nextSyncTime: string | null;
  syncInterval: string;
  platforms: Record<string, PlatformStatus>;
  recentLogs: Array<{
    category: string;
    platform: string;
    count: number;
    status: string;
    finishedAt: string;
  }>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小时前`;
  return `${Math.floor(hrs / 24)} 天前`;
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "即将执行";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} 分钟后`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} 小时 ${mins % 60} 分钟后`;
}

export default function SyncStatusPanel() {
  const [status, setStatus] = useState<SyncStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/sync-status");
      const data = await res.json();
      setStatus(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 60000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-zw-border bg-white p-5">
        <div className="flex items-center gap-2 text-zw-text-secondary">
          <RefreshCw size={16} className="animate-spin" />
          <span className="text-sm">加载同步状态...</span>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const platforms = Object.values(status.platforms || {});
  const okCount = platforms.filter((p) => p.status === "ok").length;
  const errorCount = platforms.filter((p) => p.status !== "ok").length;

  return (
    <div className="rounded-lg border border-zw-border bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-zw-primary" />
          <h3 className="font-semibold text-zw-text">实时监控状态</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-zw-text-secondary">
          {status.lastSyncTime && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              上次同步: {timeAgo(status.lastSyncTime)}
            </span>
          )}
          {status.nextSyncTime && (
            <span className="flex items-center gap-1">
              <RefreshCw size={12} />
              下次同步: {timeUntil(status.nextSyncTime)}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-sm">
          <CheckCircle size={14} className="text-emerald-500" />
          <span className="text-zw-text">{okCount} 个平台正常</span>
        </div>
        {errorCount > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <XCircle size={14} className="text-red-500" />
            <span className="text-red-600">{errorCount} 个平台异常</span>
          </div>
        )}
      </div>

      {platforms.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zw-border text-zw-text-secondary">
                <th className="text-left py-2 pr-4 font-medium">平台</th>
                <th className="text-left py-2 pr-4 font-medium">类型</th>
                <th className="text-left py-2 pr-4 font-medium">数据量</th>
                <th className="text-left py-2 pr-4 font-medium">状态</th>
                <th className="text-left py-2 font-medium">同步时间</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((p, i) => (
                <tr
                  key={i}
                  className="border-b border-zw-border last:border-0"
                >
                  <td className="py-2 pr-4 font-medium text-zw-text">
                    {p.platform}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs ${
                        p.category === "drama"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {p.category === "drama" ? "短剧" : "小说"}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-zw-text">{p.count} 条</td>
                  <td className="py-2 pr-4">
                    {p.status === "ok" ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle size={14} />
                        正常
                      </span>
                    ) : (
                      <span
                        className="flex items-center gap-1 text-red-600"
                        title={p.errorMsg || ""}
                      >
                        <XCircle size={14} />
                        异常
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-zw-text-secondary text-xs">
                    {p.finishedAt ? timeAgo(p.finishedAt) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {platforms.length === 0 && (
        <p className="text-sm text-zw-text-secondary">
          暂无同步记录，点击上方同步按钮开始抓取
        </p>
      )}
    </div>
  );
}
