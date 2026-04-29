import axios from "axios";

interface MobiReelsDrama {
  id: string;
  title: string;
  url: string;
  cover: string;
  totalEpisodes?: number;
  views?: number;
}

function slugToTitle(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());
}

export async function fetchMobiReelsDramas(): Promise<MobiReelsDrama[]> {
  try {
    const { data: html } = await axios.get("https://www.moboreels.com/dramas", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      timeout: 15000,
    });

    // Parse window.__NUXT__ IIFE to extract episode counts from state.recList
    const episodeMap = new Map<string, number>();
    try {
      const nuxtIdx = html.indexOf("window.__NUXT__=");
      if (nuxtIdx >= 0) {
        const after = html.substring(nuxtIdx + "window.__NUXT__=".length);
        let depth = 0, end = 0;
        for (let i = 0; i < after.length; i++) {
          if (after[i] === "(") depth++;
          if (after[i] === ")") { depth--; if (depth === 0) { end = i + 1; break; } }
        }
        if (end > 0) {
          const nuxtData = eval(after.substring(0, end)) as any;
          const recList = nuxtData?.state?.recList;
          if (recList) {
            const items: any[] = Array.isArray(recList) ? recList : Object.values(recList);
            for (const item of items) {
              if (item?.seriesName && item?.allEpis) {
                const key = item.seriesName.toLowerCase().replace(/[^a-z0-9]/g, "");
                episodeMap.set(key, item.allEpis);
              }
            }
          }
          // Also check data[0].list for additional items
          const mainList = nuxtData?.data?.[0]?.list;
          if (Array.isArray(mainList)) {
            for (const item of mainList) {
              if (item?.seriesName && item?.allEpis) {
                const key = item.seriesName.toLowerCase().replace(/[^a-z0-9]/g, "");
                if (!episodeMap.has(key)) episodeMap.set(key, item.allEpis);
              }
            }
          }
        }
      }
    } catch { /* ignore NUXT parsing errors */ }

    // Extract all link+image pairs
    const pattern =
      /<a[^>]*href="(\/drama\/([^"]+))"[^>]*>[^<]*<img[^>]*src="([^"]+)"/g;
    const dramas: MobiReelsDrama[] = [];
    const seen = new Set<string>();

    let match;
    while ((match = pattern.exec(html)) !== null) {
      const href = match[1];
      const slug = match[2];
      const cover = match[3].replace(/\?imageMogr2.*/, "");
      const fullUrl = `https://www.moboreels.com${href}`;

      if (seen.has(fullUrl)) continue;
      seen.add(fullUrl);

      const parts = slug.split("-");
      const id = parts.pop() || "";
      const titleSlug = parts.join("-");
      const title = slugToTitle(titleSlug);

      const totalEpisodes = episodeMap.get(title.toLowerCase().replace(/[^a-z0-9]/g, "")) || undefined;

      dramas.push({ id, title, url: fullUrl, cover, totalEpisodes });
    }

    return dramas;
  } catch (err: any) {
    console.error("Fetch MobiReels failed:", err.message);
    return [];
  }
}

async function main() {
  const dramas = await fetchMobiReelsDramas();
  console.log(`Found ${dramas.length} MobiReels dramas`);
  for (const d of dramas.slice(0, 10)) {
    console.log(`- ${d.title}`);
    console.log(`  ${d.url}`);
    console.log(`  cover=${d.cover}`);
  }
}

if (require.main === module) {
  main();
}
