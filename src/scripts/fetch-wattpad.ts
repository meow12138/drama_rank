import axios from "axios";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface WattpadStory {
  title: string;
  url: string;
  cover?: string;
  description?: string;
  tags?: string;
  views?: number;
  totalChapters?: number;
}

export async function fetchWattpadHot(): Promise<WattpadStory[]> {
  try {
    const { data } = await axios.get("https://www.wattpad.com/v4/stories", {
      params: {
        filter: "hot",
        limit: 30,
        mature: 0,
        fields:
          "stories(id,title,cover,description,tags,readCount,numParts,url,user)",
      },
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      timeout: 15000,
    });

    const stories = data?.stories || data || [];
    if (!Array.isArray(stories)) {
      console.error("Wattpad: unexpected response format");
      return [];
    }

    return stories.slice(0, 30).map((s: any) => ({
      title: s.title || "",
      url: s.url || `https://www.wattpad.com/story/${s.id}`,
      cover: s.cover || undefined,
      description: (s.description || "").substring(0, 200),
      tags: Array.isArray(s.tags) ? s.tags.slice(0, 5).join(", ") : "",
      views: s.readCount || undefined,
      totalChapters: s.numParts || undefined,
    }));
  } catch {
    // Fallback: scrape the HTML listing page
    try {
      const { data: html } = await axios.get(
        "https://www.wattpad.com/stories/hot",
        {
          headers: { "User-Agent": USER_AGENT },
          timeout: 15000,
        }
      );

      const stories: WattpadStory[] = [];
      const matches = html.match(/href="(\/story\/\d+[^"]*)"/g) || [];
      const seen = new Set<string>();

      for (const match of matches) {
        const href = match.replace('href="', "").replace('"', "");
        const fullUrl = `https://www.wattpad.com${href}`;
        if (seen.has(fullUrl)) continue;
        seen.add(fullUrl);

        const slug = href.replace(/^\/story\/\d+-/, "").replace(/-/g, " ");
        const title = slug
          .split(" ")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        stories.push({ title, url: fullUrl });
      }

      return stories.slice(0, 30);
    } catch (err2: any) {
      console.error("Fetch Wattpad failed:", err2.message);
      return [];
    }
  }
}

if (require.main === module) {
  fetchWattpadHot().then((d) => {
    console.log(`Found ${d.length} Wattpad stories`);
    d.forEach((x) => console.log(`- ${x.title}: ${x.url}`));
  });
}
