import axios from "axios";
import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface TapasNovel {
  title: string;
  url: string;
  cover?: string;
  description?: string;
  tags?: string;
}

export async function fetchTapasPopular(): Promise<TapasNovel[]> {
  try {
    const { data: html } = await axios.get(
      "https://tapas.io/comics?browse=POPULAR&genre=ALL&pageNumber=1&pageSize=30",
      {
        headers: { "User-Agent": USER_AGENT },
        timeout: 15000,
      }
    );

    const $ = cheerio.load(html);
    const novels: TapasNovel[] = [];

    $(".content__item, .browse-item, .series-item").each((_, el) => {
      const titleEl = $(el).find(
        ".content__title a, .item__title a, .title a, a.title"
      );
      let title = titleEl.text().trim();
      let href = titleEl.attr("href");

      if (!title || !href) {
        const link = $(el).find("a").first();
        href = link.attr("href");
        title =
          link.attr("title") ||
          link.find("img").attr("alt") ||
          link.text().trim();
      }

      if (!title || !href) return;

      const fullUrl = href.startsWith("http")
        ? href
        : `https://tapas.io${href}`;
      const cover =
        $(el).find("img").attr("src") ||
        $(el).find("img").attr("data-src") ||
        "";
      const desc = $(el).find(".description, .synopsis").text().trim().substring(0, 200);

      const tags: string[] = [];
      $(el)
        .find(".genre-btn, .tag")
        .each((_, tagEl) => {
          tags.push($(tagEl).text().trim());
        });

      if (title.length > 1) {
        novels.push({
          title: title.substring(0, 200),
          url: fullUrl,
          cover: cover || undefined,
          description: desc || undefined,
          tags: tags.join(", ") || "Web Novel",
        });
      }
    });

    return novels.slice(0, 30);
  } catch (err: any) {
    console.error("Fetch Tapas failed:", err.message);
    return [];
  }
}

if (require.main === module) {
  fetchTapasPopular().then((d) => {
    console.log(`Found ${d.length} Tapas novels`);
    d.forEach((x) => console.log(`- ${x.title}: ${x.url}`));
  });
}
