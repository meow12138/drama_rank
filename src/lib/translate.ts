import axios from "axios";

const MYMEMORY_URL = "https://api.mymemory.translated.net/get";
const BATCH_DELAY_MS = 800; // Be polite to free API

interface TranslateResult {
  translatedText: string;
  match: number;
}

interface MyMemoryResponse {
  responseData: TranslateResult;
  responseStatus: number;
  responseDetails?: string;
}

export async function translateText(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return "";

  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { data } = await axios.get<MyMemoryResponse>(MYMEMORY_URL, {
        params: {
          q: text.trim(),
          langpair: "en|zh-CN",
        },
        timeout: 15000,
      });

      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        return data.responseData.translatedText;
      }

      // Quota or rate limit
      if (data.responseStatus === 429) {
        await sleep(2000 * (attempt + 1));
        continue;
      }

      throw new Error(`MyMemory error: ${data.responseStatus} - ${data.responseDetails || "unknown"}`);
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries - 1) {
        await sleep(1000 * (attempt + 1));
      }
    }
  }

  console.error("Translation failed after retries:", lastError?.message || lastError);
  return "";
}

export async function translateBatch(
  items: { id: string; title: string; description?: string | null }[],
  onProgress?: (index: number, total: number) => void
): Promise<{ id: string; titleZh: string; descriptionZh: string }[]> {
  const results: { id: string; titleZh: string; descriptionZh: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress?.(i + 1, items.length);

    const titleZh = await translateText(item.title);
    // Small delay between title and description to avoid burst
    await sleep(400);
    const descriptionZh = item.description
      ? await translateText(item.description.slice(0, 450))
      : "";

    results.push({ id: item.id, titleZh, descriptionZh });

    // Delay between items
    if (i < items.length - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return results;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
