"use client";

import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";

interface FavoriteItem { id: string; savedAt: string; }

function getFavorites(): FavoriteItem[] {
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

export default function FavoriteButton({ novelId }: { novelId: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(getFavorites().some((f) => f.id === novelId));
  }, [novelId]);

  const toggle = () => {
    const favorites = getFavorites();
    if (favorites.some((f) => f.id === novelId)) {
      const next = favorites.filter((f) => f.id !== novelId);
      localStorage.setItem("novel-favorites", JSON.stringify(next));
      setSaved(false);
    } else {
      favorites.push({ id: novelId, savedAt: new Date().toISOString() });
      localStorage.setItem("novel-favorites", JSON.stringify(favorites));
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
      {saved ? "已收藏" : "收藏作品"}
    </button>
  );
}
