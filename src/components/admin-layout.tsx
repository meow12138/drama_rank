"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import SiderMenu from "./sider-menu";
import AppHeader from "./app-header";

const routeBreadcrumbs: Record<string, { label: string; href?: string }[]> = {
  "/": [{ label: "首页" }],
  "/novels": [{ label: "首页", href: "/" }, { label: "小说榜单" }],
  "/dramas": [{ label: "首页", href: "/" }, { label: "短剧监控" }],
  "/favorites": [{ label: "首页", href: "/" }, { label: "收藏管理" }],
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setIsCollapsed(true);
  }, []);

  function toggleCollapse() {
    setIsCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });
  }

  function getBreadcrumbs(): { label: string; href?: string }[] {
    if (pathname.startsWith("/novels/")) return [{ label: "首页", href: "/" }, { label: "小说榜单", href: "/novels" }, { label: "详情" }];
    if (pathname.startsWith("/dramas/")) return [{ label: "首页", href: "/" }, { label: "短剧监控", href: "/dramas" }, { label: "详情" }];
    return routeBreadcrumbs[pathname] || [{ label: "首页" }];
  }

  const crumbs = getBreadcrumbs();
  const isContentPage = pathname === "/novels" || pathname === "/dramas";

  return (
    <div className="h-screen overflow-hidden">
      <SiderMenu
        isCollapsed={isCollapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={toggleCollapse}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div
        className={`flex flex-col h-screen transition-all duration-300 max-md:ml-0`}
        style={{
          marginLeft: isCollapsed ? 64 : 220,
          width: `calc(100vw - ${isCollapsed ? 64 : 220}px)`,
        }}
      >
        <AppHeader onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        <main className={`flex-1 min-w-0 overflow-y-auto ${isContentPage ? "bg-[#0f0f13] p-0" : "px-6 py-5 bg-zw-bg flex flex-col gap-5"}`}>
          {!isContentPage && (
            <nav className="flex items-center gap-1 text-xs font-mono tracking-wider select-none">
              {crumbs.map((crumb, idx) => (
                <span key={idx} className="flex items-center gap-1">
                  {idx > 0 && (
                    <svg width="14" height="14" viewBox="0 0 14 14" className="text-[#00bf8a]/40 shrink-0">
                      <path d="M5 2l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {crumb.href && idx !== crumbs.length - 1 ? (
                    <Link
                      href={crumb.href}
                      className="relative px-2 py-1 text-gray-400 rounded hover:text-[#00bf8a] hover:bg-[#00bf8a]/5 transition-all duration-200 uppercase"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="relative px-2 py-1 text-[#00bf8a] bg-[#00bf8a]/8 rounded border border-[#00bf8a]/15 uppercase">
                      {crumb.label}
                    </span>
                  )}
                </span>
              ))}
            </nav>
          )}
          {children}
        </main>
      </div>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[199] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
