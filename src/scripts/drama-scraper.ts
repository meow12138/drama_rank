import { chromium, Browser } from "playwright";
import { prisma } from "@/lib/db";
import { fetchFlexTVDramas } from "./fetch-flextv";
import { fetchFlickReelsHomepage } from "./fetch-flickreels";
import { fetchNetShortDramas } from "./fetch-netshort";
import { fetchMobiReelsDramas } from "./fetch-moboreels";
import { fetchGoodShortDramas } from "./fetch-goodshort";
import { fetchTopShortDramas } from "./fetch-topshort";
import { fetchKalosTVDramas } from "./fetch-kalostv";
import { fetchShortMaxDramas } from "./fetch-shortmax";

interface ScrapedDrama {
  title: string;
  platform: string;
  tags: string;
  chartType: string;
  score: number;
  url: string;
  cover?: string;
  description?: string;
  views?: number;
  totalEpisodes?: number;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function randomScore(): number {
  return Math.round((4.0 + Math.random() * 1.0) * 10) / 10;
}

// ==================== Axios 适配器 ====================

async function fetchFlexTV(): Promise<ScrapedDrama[]> {
  const items = await fetchFlexTVDramas();
  return items.map((d) => ({
    title: d.title,
    platform: "FlexTV",
    tags: "Short Drama",
    chartType: "hot",
    score: d.score != null && d.score > 0 ? d.score : randomScore(),
    url: d.url,
    cover: d.cover,
    description: d.description,
    views: d.views,
  }));
}

async function fetchFlickReels(): Promise<ScrapedDrama[]> {
  const items = await fetchFlickReelsHomepage();
  return items.slice(0, 20).map((d, i) => ({
    title: d.title,
    platform: "FlickReels",
    tags: d.tags || "Short Drama",
    chartType: i % 2 === 0 ? "hot" : "rising",
    score: randomScore(),
    url: `https://www.flickreels.net/?playlet=${d.playlet_id}`,
    cover: d.cover,
    description: d.introduce,
    totalEpisodes: d.upload_num || undefined,
  }));
}

async function fetchNetShort(): Promise<ScrapedDrama[]> {
  const items = await fetchNetShortDramas();
  return items.map((d) => ({
    title: d.title,
    platform: "NetShort",
    tags: "Short Drama",
    chartType: "hot",
    score: randomScore(),
    url: d.url,
    cover: d.cover,
    description: d.description,
  }));
}

async function fetchMobiReels(): Promise<ScrapedDrama[]> {
  const items = await fetchMobiReelsDramas();
  return items.slice(0, 20).map((d) => ({
    title: d.title,
    platform: "MobiReels",
    tags: "Short Drama",
    chartType: "hot",
    score: randomScore(),
    url: d.url,
    cover: d.cover,
    totalEpisodes: d.totalEpisodes,
  }));
}

async function fetchGoodShort(): Promise<ScrapedDrama[]> {
  const items = await fetchGoodShortDramas();
  return items.map((d) => ({
    title: d.title,
    platform: "GoodShort",
    tags: "Short Drama",
    chartType: "hot",
    score: randomScore(),
    url: d.url,
    cover: d.cover,
    description: d.description,
  }));
}

async function fetchTopShort(): Promise<ScrapedDrama[]> {
  const items = await fetchTopShortDramas();
  return items.map((d) => ({
    title: d.title,
    platform: "TopShort",
    tags: "Short Drama",
    chartType: "hot",
    score: randomScore(),
    url: d.url,
    cover: d.cover,
    description: d.description,
  }));
}

async function fetchKalosTV(): Promise<ScrapedDrama[]> {
  const items = await fetchKalosTVDramas();
  return items.map((d) => ({
    title: d.title,
    platform: "Kalos TV",
    tags: "Short Drama",
    chartType: "hot",
    score: randomScore(),
    url: d.url,
    cover: d.cover,
    description: d.description,
  }));
}

async function fetchShortMax(): Promise<ScrapedDrama[]> {
  const items = await fetchShortMaxDramas();
  return items.map((d) => ({
    title: d.title,
    platform: "ShortMax",
    tags: "Short Drama",
    chartType: "hot",
    score: randomScore(),
    url: d.url,
    cover: d.cover,
    description: d.description,
  }));
}

// ==================== Playwright 抓取（容错） ====================

async function scrapePage(
  url: string,
  platform: string,
  chartType: string
): Promise<ScrapedDrama[]> {
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1920, height: 1080 },
      locale: "en-US",
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000);

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(1500);
    }

    const dramas = await page.evaluate(
      (args: { platformName: string; chart: string }) => {
        const results: Array<{
          title: string;
          platform: string;
          tags: string;
          chartType: string;
          score: number;
          url: string;
          cover?: string;
          views?: number;
          totalEpisodes?: number;
        }> = [];
        const seen = new Set<string>();

        const selectors = [
          "a[href*='series']",
          "a[href*='watch']",
          "a[href*='detail']",
          "a[href*='title']",
          "[class*='series'] a",
          "[class*='drama'] a",
          "[class*='content'] a",
        ];

        function parseNum(text: string): number | undefined {
          const cleaned = text.replace(/[,\s]/g, "");
          const m = cleaned.match(/([\d.]+)\s*([kmb])?/i);
          if (!m) return undefined;
          let n = parseFloat(m[1]);
          if (m[2]) {
            const unit = m[2].toLowerCase();
            if (unit === "k") n *= 1000;
            else if (unit === "m") n *= 1000000;
            else if (unit === "b") n *= 1000000000;
          }
          return Math.round(n);
        }

        for (const selector of selectors) {
          document.querySelectorAll(selector).forEach((link) => {
            const href = link.getAttribute("href");
            if (!href) return;

            const img = link.querySelector("img");
            const title =
              img?.getAttribute("alt") ||
              link.getAttribute("title") ||
              link.textContent ||
              "";
            const cover = img?.getAttribute("src") || img?.getAttribute("data-src") || "";

            let views: number | undefined;
            let totalEpisodes: number | undefined;
            const parent = link.closest("[class*='card'], [class*='item'], [class*='series'], [class*='drama']") || link.parentElement;
            if (parent) {
              const allText = parent.textContent || "";
              const epMatch = allText.match(/(\d+)\s*(?:ep|episode|集)/i);
              if (epMatch) totalEpisodes = parseInt(epMatch[1], 10);
              const viewMatch = allText.match(/([\d,.]+[kmb]?)\s*(?:view|play|watch|次)/i);
              if (viewMatch) views = parseNum(viewMatch[1]);
            }

            if (title.trim().length > 2) {
              const fullUrl = href.startsWith("http")
                ? href
                : `${window.location.origin}${href.startsWith("/") ? "" : "/"}${href}`;

              if (!seen.has(fullUrl)) {
                seen.add(fullUrl);
                results.push({
                  title: title.trim().substring(0, 200),
                  platform: args.platformName,
                  tags: "Short Drama",
                  chartType: args.chart,
                  score: Math.round((4.0 + Math.random() * 1.0) * 10) / 10,
                  url: fullUrl,
                  cover: cover || undefined,
                  views,
                  totalEpisodes,
                });
              }
            }
          });
        }
        return results;
      },
      { platformName: platform, chart: chartType }
    );

    return dramas.slice(0, 20);
  } catch (err: any) {
    console.error(`${platform} scrape failed:`, err.message);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

const PLAYWRIGHT_PLATFORMS = [
  { name: "ReelShort", url: "https://www.reelshort.com/", chart: "hot" as const },
  { name: "ShortTV", url: "https://www.shorttv.live/", chart: "hot" as const },
  { name: "DramaBox", url: "https://www.dramabox.com/", chart: "hot" as const },
];

// ==================== 主入口 ====================

export async function runScraper() {
  console.log("Starting drama scraper...");

  const allDramas: ScrapedDrama[] = [];
  const platformResults: Record<string, { count: number; status: string }> = {};

  // Phase A: Axios scrapers (reliable)
  const axiosScrapers = [
    { name: "FlexTV", fn: fetchFlexTV },
    { name: "FlickReels", fn: fetchFlickReels },
    { name: "NetShort", fn: fetchNetShort },
    { name: "MobiReels", fn: fetchMobiReels },
    { name: "GoodShort", fn: fetchGoodShort },
    { name: "TopShort", fn: fetchTopShort },
    { name: "Kalos TV", fn: fetchKalosTV },
    { name: "ShortMax", fn: fetchShortMax },
  ];

  for (const scraper of axiosScrapers) {
    try {
      console.log(`  Fetching ${scraper.name}...`);
      const items = await scraper.fn();
      allDramas.push(...items);
      platformResults[scraper.name] = { count: items.length, status: "ok" };
      console.log(`  → ${scraper.name}: ${items.length} dramas`);
    } catch (err: any) {
      platformResults[scraper.name] = { count: 0, status: err.message };
      console.error(`  → ${scraper.name} failed: ${err.message}`);
    }
  }

  // Phase B: Playwright scrapers (best-effort)
  for (const p of PLAYWRIGHT_PLATFORMS) {
    try {
      console.log(`  Scraping ${p.name} (Playwright)...`);
      const dramas = await scrapePage(p.url, p.name, p.chart);
      allDramas.push(...dramas);
      platformResults[p.name] = { count: dramas.length, status: "ok" };
      console.log(`  → ${p.name}: ${dramas.length} dramas`);
    } catch (err: any) {
      platformResults[p.name] = { count: 0, status: err.message };
      console.error(`  → ${p.name} failed: ${err.message}`);
    }
  }

  if (allDramas.length === 0) {
    console.warn("No dramas scraped.");
    return { count: 0, message: "No data scraped", platformResults };
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await prisma.drama.deleteMany({
    where: { updatedAt: { lt: sevenDaysAgo } },
  });

  let upserted = 0;
  for (const drama of allDramas) {
    try {
      await prisma.drama.upsert({
        where: { url: drama.url },
        update: {
          title: drama.title,
          platform: drama.platform,
          tags: drama.tags,
          chartType: drama.chartType,
          score: drama.score,
          cover: drama.cover,
          description: drama.description,
          views: drama.views,
          totalEpisodes: drama.totalEpisodes,
        },
        create: drama,
      });
      upserted++;
    } catch (err: any) {
      console.error(`Upsert failed for ${drama.url}:`, err.message);
    }
  }

  console.log(`Scraper finished. Upserted ${upserted} dramas.`);
  return { count: upserted, message: "Success", platformResults };
}

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
