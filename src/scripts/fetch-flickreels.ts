import axios from "axios";

interface FlickReelsDrama {
  playlet_id: number;
  title: string;
  cover: string;
  introduce: string;
  tags: string;
  upload_num: number;
}

async function fetchFlickReelsHomepage(): Promise<FlickReelsDrama[]> {
  try {
    const { data: html } = await axios.get("https://www.flickreels.net/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      timeout: 15000,
    });

    // Extract __NUXT_DATA__ JSON
    const match = html.match(
      /id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i
    );
    if (!match) {
      console.error("__NUXT_DATA__ not found");
      return [];
    }

    const raw = match[1].trim();
    const payload = JSON.parse(raw);

    const resolve = (idx: number): any => {
      if (idx == null) return null;
      const val = payload[idx];
      if (!val || typeof val !== "object") return val;
      if (Array.isArray(val)) {
        if (
          val.length === 2 &&
          typeof val[1] === "number" &&
          typeof val[0] === "string"
        ) {
          return resolve(val[1]);
        }
        return val.map((v) => (typeof v === "number" && v >= 0 ? resolve(v) : v));
      }
      const obj: any = {};
      for (const [k, v] of Object.entries(val)) {
        obj[k] = typeof v === "number" && v >= 0 ? resolve(v) : v;
      }
      return obj;
    };

    const root = resolve(1);
    const data = root?.data;
    if (!data) {
      console.error("No data in Nuxt payload");
      return [];
    }

    const playletListKey = Object.keys(data).find((k) =>
      k.includes("playletList")
    );
    if (!playletListKey) {
      console.error("playletList not found in data keys:", Object.keys(data));
      return [];
    }

    const listData = data[playletListKey];
    const dramas: FlickReelsDrama[] = [];
    const sections = Array.isArray(listData) ? listData : [listData];

    for (const section of sections) {
      const items = section?.playlet_list || [];
      for (const item of items) {
        if (item?.title) {
          // Tags may be objects with name property
          let tagStr = "";
          if (Array.isArray(item.tag_list)) {
            tagStr = item.tag_list
              .map((t: any) => (typeof t === "object" ? t.name || "" : t))
              .filter(Boolean)
              .join(", ");
          }

          dramas.push({
            playlet_id: item.playlet_id,
            title: item.title,
            cover: item.cover || "",
            introduce: item.introduce || "",
            tags: tagStr || "Short Drama",
            upload_num: item.upload_num || 0,
          });
        }
      }
    }

    const seen = new Set<number>();
    return dramas.filter((d) => {
      if (seen.has(d.playlet_id)) return false;
      seen.add(d.playlet_id);
      return true;
    });
  } catch (err: any) {
    console.error("Fetch FlickReels failed:", err.message);
    return [];
  }
}

export { fetchFlickReelsHomepage };

async function main() {
  const dramas = await fetchFlickReelsHomepage();
  console.log(`Found ${dramas.length} dramas from FlickReels`);
  for (const d of dramas.slice(0, 10)) {
    console.log(`- ${d.title}`);
    console.log(`  id=${d.playlet_id}, episodes=${d.upload_num}`);
    console.log(`  cover=${d.cover}`);
    console.log(`  tags=${d.tags}`);
    console.log(`  intro=${d.introduce?.slice(0, 100)}...`);
  }
}

if (require.main === module) {
  main();
}