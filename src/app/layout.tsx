import type { Metadata } from "next";
import "./globals.css";
import AdminLayout from "@/components/admin-layout";

export const metadata: Metadata = {
  title: "海外爆款内容监控",
  description: "实时追踪海外热门小说与短剧，数据真实可点击跳转",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=1920" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AdminLayout>{children}</AdminLayout>
      </body>
    </html>
  );
}
