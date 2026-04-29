import axios from "axios";

interface NetShortDrama {
  id: string;
  title: string;
  url: string;
  cover?: string;
  description?: string;
}

const CATEGORIES = [
  "https://netshort.com/", // Homepage trending
  "https://netshort.com/drama/underdog-rise-1983832036239818755",
  "https://netshort.com/drama/Contract%20Lovers-1983832091947950083",
  "https://netshort.com/drama/Fantasy%20Romance-1983832092417712131",
  "https://netshort.com/drama/Historical%20Romance-1983832092962971651",
  "https://netshort.com/drama/Karma%20Payback-1983832036294344705",
  "https://netshort.com/drama/Life%20OL-1983832036319510531",
  "https://netshort.com/drama/Mafia-1983832036629889026",
  "https://netshort.com/drama/Sweet%20Romance-1983832091151032322",
];

async function fetchEpisodeList(categoryUrl: string): Promise<NetShortDrama[]> {
  try {
    const { data: html } = await axios.get(categoryUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      timeout: 15000,
    });

    const matches = html.match(/href="(\/episode\/[^"]+)"/g) || [];
    const dramas: NetShortDrama[] = [];
    const seen = new Set<string>();

    for (const match of matches) {
      const href = match.replace('href="', "").replace('"', "");
      const fullUrl = `https://netshort.com${href}`;
      if (seen.has(fullUrl)) continue;
      seen.add(fullUrl);

      // Extract slug and id from href
      const parts = href.replace("/episode/", "").split("-");
      const id = parts.pop() || "";
      const slug = parts.join("-");
      const title = slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      dramas.push({ id, title, url: fullUrl });
    }

    return dramas;
  } catch (err: any) {
    console.error(`Fetch category failed: ${categoryUrl}`, err.message);
    return [];
  }
}

async function fetchEpisodeDetail(
  drama: NetShortDrama
): Promise<NetShortDrama> {
  try {
    const { data: html } = await axios.get(drama.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });

    // Extract title
    const titleMatch = html.match(
      /<title>([^\-<]*)(?:\s*-\s*NetShort)?<\/title>/i
    );
    if (titleMatch) {
      drama.title = titleMatch[1].replace("Online Watch", "").trim();
    }

    // Extract description
    const descMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i
    );
    if (descMatch) {
      drama.description = descMatch[1]
        .replace(/Watch .*? for free on NetShort\. Discover more popular dramas\./, "")
        .trim();
    }

    // Extract cover image
    const coverMatch = html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)/i
    );
    if (coverMatch) {
      drama.cover = coverMatch[1];
    }

    return drama;
  } catch (err: any) {
    console.error(`Fetch detail failed: ${drama.url}`, err.message);
    return drama;
  }
}

export async function fetchNetShortDramas(): Promise<NetShortDrama[]> {
  console.log("Fetching NetShort episode lists from categories...");

  const allEpisodes: NetShortDrama[] = [];
  const seenUrls = new Set<string>();

  for (const category of CATEGORIES) {
    const episodes = await fetchEpisodeList(category);
    console.log(`  ${category} → ${episodes.length} episodes`);
    for (const ep of episodes) {
      if (!seenUrls.has(ep.url)) {
        seenUrls.add(ep.url);
        allEpisodes.push(ep);
      }
    }
  }

  console.log(`Total unique episodes: ${allEpisodes.length}`);

  // Fetch details for first 30 episodes (to avoid rate limiting)
  const toFetch = allEpisodes.slice(0, 30);
  console.log(`Fetching details for ${toFetch.length} episodes...`);

  const results: NetShortDrama[] = [];
  for (const ep of toFetch) {
    const detail = await fetchEpisodeDetail(ep);
    results.push(detail);
    // Small delay to be polite
    await new Promise((r) => setTimeout(r, 300));
  }

  return results;
}

async function main() {
  const dramas = await fetchNetShortDramas();
  console.log(`\nFetched ${dramas.length} NetShort dramas`);
  for (const d of dramas.slice(0, 10)) {
    console.log(`- ${d.title}`);
    console.log(`  ${d.url}`);
    if (d.cover) console.log(`  cover=${d.cover.slice(0, 80)}...`);
    if (d.description)
      console.log(`  desc=${d.description.slice(0, 100)}...`);
  }
}

if (require.main === module) {
  main();
}
