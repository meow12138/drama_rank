import axios from "axios";

interface FlexTVDrama {
  title: string;
  url: string;
  cover?: string;
  description?: string;
  views?: number;
  score?: number;
}

function parseViewCount(text: string): number | undefined {
  if (!text) return undefined;
  const cleaned = text.replace(/[,\s]/g, "").trim();
  const m = cleaned.match(/([\d.]+)\s*([KkMmBb])?/);
  if (!m) return undefined;
  let n = parseFloat(m[1]);
  if (m[2]) {
    const u = m[2].toUpperCase();
    if (u === "K") n *= 1000;
    else if (u === "M") n *= 1000000;
    else if (u === "B") n *= 1000000000;
  }
  return Math.round(n);
}

function slugToTitle(slug: string): string {
  // Remove leading "episode-1-" and trailing hash (-[A-Za-z0-9]+)
  let cleaned = slug.replace(/^episode-1-/, "");
  cleaned = cleaned.replace(/-[A-Za-z0-9]{10,}$/, "");
  // Replace hyphens with spaces and capitalize
  return cleaned
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function fetchFlexTVDramas(): Promise<FlexTVDrama[]> {
  try {
    const { data } = await axios.get("https://www.flextv.cc/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      timeout: 15000,
    });

    // Extract unique episode slugs
    const matches = (data as string).match(/episode-1-[^"\s\'>]*/g) || [];
    const uniqueSlugs = [...new Set(matches)] as string[];

    const dramas: FlexTVDrama[] = [];
    const seenTitles = new Set<string>();

    for (const slug of uniqueSlugs.slice(0, 20)) {
      const title = slugToTitle(slug);
      if (seenTitles.has(title)) continue;
      seenTitles.add(title);

      const url = `https://www.flextv.cc/episodes/${slug}`;
      let cover: string | undefined;

      // Try to fetch episode page for description + JSON-LD stats
      let description = "";
      let views: number | undefined;
      let score: number | undefined;
      try {
        const episodeRes = await axios.get(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
          timeout: 8000,
        });
        const html = episodeRes.data as string;

        const descMatch = html.match(
          /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i
        );
        description = descMatch?.[1] || "";

        // Extract JSON-LD structured data
        const ldMatches = html.match(
          /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
        );
        if (ldMatches) {
          for (const ldTag of ldMatches) {
            try {
              const jsonStr = ldTag.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "");
              const ld = JSON.parse(jsonStr);
              if (ld.aggregateRating?.ratingValue) {
                score = parseFloat(ld.aggregateRating.ratingValue);
              }
              if (Array.isArray(ld.interactionStatistic)) {
                for (const stat of ld.interactionStatistic) {
                  if (stat.interactionType?.["@type"] === "WatchAction" && stat.userInteractionCount) {
                    views = parseViewCount(String(stat.userInteractionCount));
                  }
                }
              }
              // Cover from JSON-LD thumbnailUrl
              if (!cover && ld.thumbnailUrl) {
                cover = Array.isArray(ld.thumbnailUrl) ? ld.thumbnailUrl[0] : ld.thumbnailUrl;
              }
            } catch { /* ignore malformed JSON-LD */ }
          }
        }
      } catch {
        // ignore
      }

      dramas.push({
        title,
        url,
        cover: cover || undefined,
        description: description || undefined,
        views,
        score,
      });
    }

    return dramas;
  } catch (err: any) {
    console.error("Fetch FlexTV failed:", err.message);
    return [];
  }
}

async function main() {
  const dramas = await fetchFlexTVDramas();
  console.log(`Found ${dramas.length} FlexTV dramas`);
  for (const d of dramas) {
    console.log(`- ${d.title}`);
    console.log(`  ${d.url}`);
    if (d.description) console.log(`  ${d.description.slice(0, 100)}...`);
  }
}

if (require.main === module) {
  main();
}
