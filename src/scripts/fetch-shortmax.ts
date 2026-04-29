import axios from "axios";
import * as cheerio from "cheerio";

interface ShortMaxDrama {
  title: string;
  url: string;
  cover?: string;
  description?: string;
}

export async function fetchShortMaxDramas(): Promise<ShortMaxDrama[]> {
  try {
    const { data: html } = await axios.get("https://shortmax.com/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(html);
    const dramas: ShortMaxDrama[] = [];
    const seen = new Set<string>();

    $("a[href*='/drama/'], a[href*='/series/'], a[href*='/watch/'], a[href*='/play/']").each(
      (_, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        const fullUrl = href.startsWith("http")
          ? href
          : `https://shortmax.com${href.startsWith("/") ? "" : "/"}${href}`;

        if (seen.has(fullUrl)) return;
        seen.add(fullUrl);

        const img = $(el).find("img").first();
        const title =
          img.attr("alt") || $(el).attr("title") || $(el).text().trim() || "";
        const cover = img.attr("src") || img.attr("data-src") || "";

        if (title.length > 2) {
          dramas.push({
            title: title.substring(0, 200),
            url: fullUrl,
            cover: cover || undefined,
          });
        }
      }
    );

    return dramas.slice(0, 20);
  } catch (err: any) {
    console.error("Fetch ShortMax failed:", err.message);
    return [];
  }
}

if (require.main === module) {
  fetchShortMaxDramas().then((d) => {
    console.log(`Found ${d.length} ShortMax dramas`);
    d.forEach((x) => console.log(`- ${x.title}: ${x.url}`));
  });
}
