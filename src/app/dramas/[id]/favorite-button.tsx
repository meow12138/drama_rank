"use client";

import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";

interface FavoriteItem { id: string; savedAt: string; }

function getFavorites(): FavoriteItem[] {
  const raw = JSON.parse(localStorage.getItem("drama-favorites") || "[]");
  if (raw.length > 0 && typeof raw[0] === "string") {
    const migrated = raw.map((id: string) => ({ id, savedAt: new Date().toISOString() }));
    localStorage.setItem("drama-favorites", JSON.stringify(migrated));
    return migrated;
  }
  return raw as FavoriteItem[];
}

export default function FavoriteButton({ dramaId }: { dramaId: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(getFavorites().some((f) => f.id === dramaId));
  }, [dramaId]);

  const toggle = () => {
    const favorites = getFavorites();
    if (saved) {
      const next = favorites.filter((f) => f.id !== dramaId);
      localStorage.setItem("drama-favorites", JSON.stringify(next));
      setSaved(false);
    } else {
      favorites.push({ id: dramaId, savedAt: new Date().toISOString() });
      localStorage.setItem("drama-favorites", JSON.stringify(favorites));
      setSaved(true);
    }
  };

  return (
    <button
      onClick={toggle}
      className={`h-9 px-5 rounded text-[13px] inline-flex items-center gap-1.5 transition-colors ${
        saved
          ? "bg-zw-primary-bg text-zw-primary border border-zw-primary"
          : "border border-[rgb(220,223,230)] bg-white text-zw-text hover:border-zw-primary hover:text-zw-primary"
      }`}
    >
      <Bookmark size={14} className={saved ? "fill-current" : ""} />
      {saved ? "已收藏" : "收藏"}
    </button>
  );
}
