"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  Clapperboard,
  Bookmark,
  PanelLeftClose,
  PanelLeft,
  X,
  Star,
} from "lucide-react";

interface SiderMenuProps {
  isCollapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onMobileClose: () => void;
}

const menuItems = [
  { path: "/", label: "首页", icon: LayoutDashboard },
  { path: "/novels", label: "小说榜单", icon: BookOpen },
  { path: "/dramas", label: "短剧监控", icon: Clapperboard },
  { path: "/favorites", label: "收藏管理", icon: Bookmark },
];

export default function SiderMenu({
  isCollapsed,
  mobileOpen,
  onToggleCollapse,
  onMobileClose,
}: SiderMenuProps) {
  const pathname = usePathname();

  function isActive(path: string) {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  }

  const expanded = !isCollapsed || mobileOpen;

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white border-r border-zw-border flex flex-col z-[200] transition-all duration-300 overflow-hidden ${
        isCollapsed && !mobileOpen ? "w-16" : "w-[220px]"
      } max-md:-translate-x-full ${mobileOpen ? "max-md:translate-x-0" : ""}`}
    >
      <div className="h-[60px] flex items-center justify-center gap-2.5 shrink-0 px-4">
        <div className="w-9 h-9 rounded-full bg-zw-primary-bg flex items-center justify-center shrink-0">
          <Star size={18} className="text-zw-primary" />
        </div>
        {expanded && (
          <span className="text-lg font-bold text-zw-text whitespace-nowrap">
            内容监控
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {menuItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => mobileOpen && onMobileClose()}
              className={`flex items-center gap-3 h-[46px] rounded px-3 mx-1 my-0.5 text-sm transition-colors ${
                active
                  ? "bg-zw-primary-bg text-zw-primary font-semibold"
                  : "text-[#4e5969] hover:bg-black/[0.04]"
              } ${!expanded ? "justify-center px-0" : ""}`}
            >
              <Icon size={18} />
              {expanded && <span>{item.label}</span>}
            </Link>
          );
        })}

      </nav>

      <div
        className="h-11 flex items-center justify-end px-4 bg-[#f7f8fa] border-t border-zw-border cursor-pointer text-zw-text-secondary hover:text-zw-primary shrink-0"
        onClick={mobileOpen ? onMobileClose : onToggleCollapse}
      >
        {!isCollapsed && !mobileOpen && <PanelLeftClose size={16} />}
        {isCollapsed && !mobileOpen && <PanelLeft size={16} />}
        {mobileOpen && <X size={16} />}
      </div>
    </aside>
  );
}
