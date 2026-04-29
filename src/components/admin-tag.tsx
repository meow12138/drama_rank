import type { ReactNode } from "react";

interface AdminTagProps {
  children: ReactNode;
  color?: "green" | "blue" | "red" | "amber" | "violet" | "cyan" | "rose" | "orange" | "pink" | "lime" | "teal" | "emerald" | "sky" | "gray";
}

const colorMap: Record<string, string> = {
  green: "bg-[#e6f9f3] text-[#00bf8a] border-[#b3ecd9]",
  blue: "bg-[#e8f3ff] text-[#1677ff] border-[#b3d4ff]",
  red: "bg-[#ffece8] text-[#f53f3f] border-[#fbbfb5]",
  amber: "bg-[#fff7e8] text-[#ff7d00] border-[#ffd991]",
  violet: "bg-[#f3e8ff] text-[#7c3aed] border-[#d8b4fe]",
  cyan: "bg-[#e8fffe] text-[#0891b2] border-[#a5f3fc]",
  rose: "bg-[#fff1f2] text-[#e11d48] border-[#fecdd3]",
  orange: "bg-[#fff7ed] text-[#ea580c] border-[#fed7aa]",
  pink: "bg-[#fdf2f8] text-[#db2777] border-[#fbcfe8]",
  lime: "bg-[#f7fee7] text-[#65a30d] border-[#d9f99d]",
  teal: "bg-[#f0fdfa] text-[#0d9488] border-[#99f6e4]",
  emerald: "bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]",
  sky: "bg-[#f0f9ff] text-[#0284c7] border-[#bae6fd]",
  gray: "bg-[#f4f5f5] text-[#86909c] border-[#e5e6e8]",
};

export default function AdminTag({ children, color = "gray" }: AdminTagProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs rounded border ${colorMap[color] || colorMap.gray}`}
    >
      {children}
    </span>
  );
}
