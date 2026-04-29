import axios from "axios";
import * as cheerio from "cheerio";
import { chromium, Browser, Page } from "playwright";
import { prisma } from "@/lib/db";
import { fetchNovelUpdatesRanking } from "./fetch-novelupdates";
import { fetchWattpadHot } from "./fetch-wattpad";
import { fetchTapasPopular } from "./fetch-tapas";

interface ScrapedNovel {
  title: string;
  platform: string;
  tags: string;
  rankingTime: string;
  score: number;
  url: string;
  cover?: string;
  description?: string;
  views?: number;
  totalChapters?: number;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ==================== Axios 抓取（无反爬平台）====================

async function fetchRoyalRoadRanking(
  path: string,
  rankingTime: string
): Promise<ScrapedNovel[]> {
  const url = `https://www.royalroad.com${path}`;
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 15000,
    });
    const $ = cheerio.load(data);
    const novels: ScrapedNovel[] = [];

    $(".fiction-list-item").each((_, el) => {
      const titleEl = $(el).find(".fiction-title a");
      const title = titleEl.text().trim();
      const href = titleEl.attr("href");
      const cover = $(el).find("img").attr("src");
      const desc = $(el)
        .find(".margin-bottom-10")
        .text()
        .trim()
        .replace(/\s+/g, " ")
        .substring(0, 200);
      const starsText = $(el).find(".star").attr("title") || "";
      const scoreMatch = starsText.match(/([\d.]+)/);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;

      const tags: string[] = [];
      $(el)
        .find(".tags .label")
        .each((_, tagEl) => {
          tags.push($(tagEl).text().trim());
        });

      // Extract stats (views, chapters) from the stats columns
      let views: number | undefined;
      let totalChapters: number | undefined;
      $(el).find(".stats span, .stats .col-sm-3").each((_, statEl) => {
        const text = $(statEl).text().trim().toLowerCase();
        const numText = text.replace(/[,.\s]/g, "");
        const numMatch = numText.match(/(\d+)/);
        if (!numMatch) return;
        const num = parseInt(numMatch[1], 10);
        if (text.includes("view") || text.includes("follower")) {
          if (!views || num > views) views = num;
        } else if (text.includes("chapter") || text.includes("page")) {
          totalChapters = num;
        }
      });

      if (title && href) {
        novels.push({
          title,
          platform: "RoyalRoad",
          tags: tags.join(", "),
          rankingTime,
          score: Math.min(score, 5),
          url: href.startsWith("http")
            ? href
            : `https://www.royalroad.com${href}`,
          cover: cover || undefined,
          description: desc || undefined,
          views,
          totalChapters,
        });
      }
    });

    return novels.slice(0, 30);
  } catch (err: any) {
    console.error(`RoyalRoad ${rankingTime} fetch failed:`, err.message);
    return [];
  }
}

// ==================== Playwright 抓取（有反爬平台）====================

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      channel: "msedge",
      headless: true,
    });
  }
  return browser;
}

async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

async function fetchWithBrowser(
  url: string,
  waitForSelector?: string,
  timeout = 30000
): Promise<string> {
  const b = await getBrowser();
  const page: Page = await b.newPage();
  try {
    await page.setExtraHTTPHeaders({ "User-Agent": USER_AGENT });
    await page.goto(url, { waitUntil: "networkidle", timeout });

    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout });
    }

    // 等待 Cloudflare 验证通过（如果出现了验证页面）
    const title = await page.title();
    if (title.toLowerCase().includes("just a moment")) {
      console.warn(`Cloudflare challenge detected on ${url}, waiting...`);
      await page.waitForTimeout(5000);
    }

    const html = await page.content();
    return html;
  } finally {
    await page.close();
  }
}

async function fetchScribbleHubRanking(
  sort: number,
  rankingTime: string
): Promise<ScrapedNovel[]> {
  const url = `https://www.scribblehub.com/series-ranking/?sort=${sort}`;
  try {
    const html = await fetchWithBrowser(url, ".search_main_box", 30000);
    const $ = cheerio.load(html);
    const novels: ScrapedNovel[] = [];

    $(".search_main_box").each((_, el) => {
      const titleEl = $(el).find(".search_title a");
      const title = titleEl.text().trim();
      const href = titleEl.attr("href");
      const cover = $(el).find(".search_img img").attr("src");
      const desc = $(el)
        .find(".search_desc")
        .text()
        .trim()
        .replace(/\s+/g, " ")
        .substring(0, 200);
      const ratingText = $(el).find(".search_ratings").text() || "";
      const scoreMatch = ratingText.match(/([\d.]+)/);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;

      const tags: string[] = [];
      $(el)
        .find(".search_genre .genre")
        .each((_, tagEl) => {
          tags.push($(tagEl).text().trim());
        });

      let views: number | undefined;
      let totalChapters: number | undefined;
      $(el).find(".search_stats span, .nl_stats span, .fic_stats span").each((_, statEl) => {
        const text = $(statEl).text().trim().toLowerCase();
        const numStr = text.replace(/[,\s]/g, "");
        const numMatch = numStr.match(/(\d+)/);
        if (!numMatch) return;
        let num = parseInt(numMatch[1], 10);
        if (text.includes("k")) num = Math.round(num * 1000);
        if (text.includes("m")) num = Math.round(num * 1000000);
        if (text.includes("view") || text.includes("read")) {
          views = num;
        } else if (text.includes("ch")) {
          totalChapters = num;
        }
      });

      if (title && href) {
        novels.push({
          title,
          platform: "ScribbleHub",
          tags: tags.join(", "),
          rankingTime,
          score: Math.min(score, 5),
          url: href.startsWith("http") ? href : `https://www.scribblehub.com${href}`,
          cover: cover || undefined,
          description: desc || undefined,
          views,
          totalChapters,
        });
      }
    });

    console.log(`ScribbleHub ${rankingTime} fetched ${novels.length} novels`);
    return novels.slice(0, 30);
  } catch (err: any) {
    console.error(`ScribbleHub ${rankingTime} fetch failed:`, err.message);
    return [];
  }
}

async function fetchWebnovelRanking(
  rankingTime: string
): Promise<ScrapedNovel[]> {
  const url = "https://www.webnovel.com/ranking/power_ranking";
  try {
    const html = await fetchWithBrowser(url, ".j_rank_li", 30000);
    const $ = cheerio.load(html);
    const novels: ScrapedNovel[] = [];

    $(".j_rank_li").each((_, el) => {
      const titleEl = $(el).find(".g_txt1 a");
      const title = titleEl.text().trim();
      const href = titleEl.attr("href");
      const cover = $(el).find("img").attr("src");
      const desc = $(el)
        .find(".g_txt2")
        .text()
        .trim()
        .replace(/\s+/g, " ")
        .substring(0, 200);
      const scoreText = $(el).find(".score").text() || "";
      const scoreMatch = scoreText.match(/([\d.]+)/);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;

      const tags: string[] = [];
      $(el)
        .find(".g_tags span")
        .each((_, tagEl) => {
          tags.push($(tagEl).text().trim());
        });

      let views: number | undefined;
      let totalChapters: number | undefined;
      const allText = $(el).text();
      const viewsMatch = allText.match(/([\d,.]+)\s*(?:views?|reads?)/i);
      if (viewsMatch) views = parseInt(viewsMatch[1].replace(/[,.\s]/g, ""), 10);
      const chapterMatch = allText.match(/([\d,.]+)\s*(?:chapters?|chs?)/i);
      if (chapterMatch) totalChapters = parseInt(chapterMatch[1].replace(/[,.\s]/g, ""), 10);

      if (title && href) {
        novels.push({
          title,
          platform: "Webnovel",
          tags: tags.join(", "),
          rankingTime,
          score: Math.min(score, 5),
          url: href.startsWith("http") ? href : `https://www.webnovel.com${href}`,
          cover: cover || undefined,
          description: desc || undefined,
          views,
          totalChapters,
        });
      }
    });

    console.log(`Webnovel fetched ${novels.length} novels`);
    return novels.slice(0, 30);
  } catch (err: any) {
    console.error(`Webnovel fetch failed:`, err.message);
    return [];
  }
}

// ==================== 主逻辑 ====================

export async function runScraper() {
  console.log("Starting scraper...");

  const allNovels: ScrapedNovel[] = [];

  // RoyalRoad - 今日热门
  const rrDaily = await fetchRoyalRoadRanking("/fictions/daily-views", "today");
  allNovels.push(...rrDaily);

  // RoyalRoad - 本周热门
  const rrWeekly = await fetchRoyalRoadRanking("/fictions/weekly-views", "week");
  allNovels.push(...rrWeekly);

  // RoyalRoad - 本月热门
  const rrMonthly = await fetchRoyalRoadRanking("/fictions/monthly-views", "month");
  allNovels.push(...rrMonthly);

  // RoyalRoad - 最佳评分（长期）
  const rrBest = await fetchRoyalRoadRanking("/fictions/best-rated", "week");
  const existingUrls = new Set(allNovels.map((n) => n.url));
  rrBest.forEach((n) => {
    if (!existingUrls.has(n.url)) {
      allNovels.push(n);
      existingUrls.add(n.url);
    }
  });

  // ScribbleHub - 周排行
  const shWeekly = await fetchScribbleHubRanking(1, "week");
  shWeekly.forEach((n) => {
    if (!existingUrls.has(n.url)) {
      allNovels.push(n);
      existingUrls.add(n.url);
    }
  });

  // ScribbleHub - 月排行
  const shMonthly = await fetchScribbleHubRanking(2, "month");
  shMonthly.forEach((n) => {
    if (!existingUrls.has(n.url)) {
      allNovels.push(n);
      existingUrls.add(n.url);
    }
  });

  // Webnovel - Power Ranking
  const wn = await fetchWebnovelRanking("week");
  wn.forEach((n) => {
    if (!existingUrls.has(n.url)) {
      allNovels.push(n);
      existingUrls.add(n.url);
    }
  });

  // NovelUpdates - Popular Ranking
  try {
    console.log("Fetching NovelUpdates...");
    const nuItems = await fetchNovelUpdatesRanking();
    nuItems.forEach((n) => {
      const novel: ScrapedNovel = {
        title: n.title,
        platform: "NovelUpdates",
        tags: n.tags || "Web Novel",
        rankingTime: "week",
        score: n.score || 0,
        url: n.url,
        cover: n.cover,
        description: n.description,
      };
      if (!existingUrls.has(novel.url)) {
        allNovels.push(novel);
        existingUrls.add(novel.url);
      }
    });
    console.log(`  NovelUpdates: ${nuItems.length} novels`);
  } catch (err: any) {
    console.error("NovelUpdates failed:", err.message);
  }

  // Wattpad - Hot Stories
  try {
    console.log("Fetching Wattpad...");
    const wpItems = await fetchWattpadHot();
    wpItems.forEach((n) => {
      const novel: ScrapedNovel = {
        title: n.title,
        platform: "Wattpad",
        tags: n.tags || "Web Novel",
        rankingTime: "week",
        score: 0,
        url: n.url,
        cover: n.cover,
        description: n.description,
        views: n.views,
        totalChapters: n.totalChapters,
      };
      if (!existingUrls.has(novel.url)) {
        allNovels.push(novel);
        existingUrls.add(novel.url);
      }
    });
    console.log(`  Wattpad: ${wpItems.length} novels`);
  } catch (err: any) {
    console.error("Wattpad failed:", err.message);
  }

  // Tapas - Popular
  try {
    console.log("Fetching Tapas...");
    const tapasItems = await fetchTapasPopular();
    tapasItems.forEach((n) => {
      const novel: ScrapedNovel = {
        title: n.title,
        platform: "Tapas",
        tags: n.tags || "Web Novel",
        rankingTime: "week",
        score: 0,
        url: n.url,
        cover: n.cover,
        description: n.description,
      };
      if (!existingUrls.has(novel.url)) {
        allNovels.push(novel);
        existingUrls.add(novel.url);
      }
    });
    console.log(`  Tapas: ${tapasItems.length} novels`);
  } catch (err: any) {
    console.error("Tapas failed:", err.message);
  }

  // 关闭浏览器
  await closeBrowser();

  if (allNovels.length === 0) {
    console.warn("No novels scraped. Maybe sites are blocking requests.");
    return { count: 0, message: "No data scraped" };
  }

  // 清理旧数据（保留最近7天的）
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await prisma.novel.deleteMany({
    where: { updatedAt: { lt: sevenDaysAgo } },
  });

  // 插入或更新数据
  let upserted = 0;
  for (const novel of allNovels) {
    await prisma.novel.upsert({
      where: { url: novel.url },
      update: {
        title: novel.title,
        platform: novel.platform,
        tags: novel.tags,
        rankingTime: novel.rankingTime,
        score: novel.score,
        cover: novel.cover,
        description: novel.description,
        views: novel.views,
        totalChapters: novel.totalChapters,
      },
      create: novel,
    });
    upserted++;
  }

  console.log(`Scraper finished. Upserted ${upserted} novels.`);
  return { count: upserted, message: "Success" };
}

// CLI 入口
if (require.main === module) {
  runScraper()
    .then((res) => {
      console.log(res);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
