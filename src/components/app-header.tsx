"use client";

import { Menu, Bell } from "lucide-react";

interface AppHeaderProps {
  onMenuToggle: () => void;
}

export default function AppHeader({ onMenuToggle }: AppHeaderProps) {
  return (
    <header className="h-[var(--zw-header-height)] bg-white border-b border-zw-border flex items-center justify-between px-4 sticky top-0 z-[100] shrink-0">
      <div className="flex items-center gap-2">
        <button
          className="md:hidden p-1.5 rounded hover:bg-zw-hover text-zw-text-secondary"
          onClick={onMenuToggle}
        >
          <Menu size={20} />
        </button>
        <span className="text-sm font-medium text-zw-text">
          海外爆款小说短剧 · 内容监控
        </span>
      </div>
      <div className="flex items-center">
        <div className="relative">
          <Bell size={18} className="text-zw-text-secondary cursor-pointer hover:text-zw-text" />
          <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-zw-danger text-white text-[10px] rounded-full flex items-center justify-center">
            3
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-zw-primary text-white flex items-center justify-center text-sm font-medium ml-4">
          A
        </div>
      </div>
    </header>
  );
}
