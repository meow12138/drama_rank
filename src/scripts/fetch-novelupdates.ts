import axios from "axios";
import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface NovelUpdatesNovel {
  title: string;
  url: string;
  cover?: string;
  description?: string;
  tags?: string;
  score?: number;
}

export async function fetchNovelUpdatesRanking(): Promise<NovelUpdatesNovel[]> {
  try {
    const { data: html } = await axios.get(
      "https://www.novelupdates.com/series-ranking/?rank=popular",
      {
        headers: { "User-Agent": USER_AGENT },
        timeout: 15000,
      }
    );

    const $ = cheerio.load(html);
    const novels: NovelUpdatesNovel[] = [];

    $(".search_main_box_nu, .search_body_nu .bdesc").each((_, el) => {
      const titleEl = $(el).find(".search_title a, .w-blog-entry-title a");
      const title = titleEl.text().trim();
      const href = titleEl.attr("href");
      const cover = $(el).find("img").attr("src") || "";
      const desc = $(el)
        .find(".search_body_nu .testhide, .w-blog-entry-short")
        .text()
        .trim()
        .substring(0, 200);
      const ratingText = $(el).find(".search_ratings .uvotes, .nurating").text();
      const scoreMatch = ratingText.match(/([\d.]+)/);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;

      const tags: string[] = [];
      $(el)
        .find(".search_genre .gennew, .genre_label")
        .each((_, tagEl) => {
          tags.push($(tagEl).text().trim());
        });

      if (title && href) {
        novels.push({
          title,
          url: href.startsWith("http")
            ? href
            : `https://www.novelupdates.com${href}`,
          cover: cover || undefined,
          description: desc || undefined,
          tags: tags.join(", ") || "Web Novel",
          score: Math.min(score, 5),
        });
      }
    });

    return novels.slice(0, 30);
  } catch (err: any) {
    console.error("Fetch NovelUpdates failed:", err.message);
    return [];
  }
}

if (require.main === module) {
  fetchNovelUpdatesRanking().then((d) => {
    console.log(`Found ${d.length} NovelUpdates novels`);
    d.forEach((x) => console.log(`- ${x.title}`));
  });
}
