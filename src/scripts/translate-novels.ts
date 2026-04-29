import { prisma } from "@/lib/db";
import { translateText } from "@/lib/translate";

async function main() {
  const novels = await prisma.novel.findMany({
    where: {
      OR: [
        { titleZh: null },
        { titleZh: "" },
        {
          AND: [
            { description: { not: null } },
            { description: { not: "" } },
            { OR: [{ descriptionZh: null }, { descriptionZh: "" }] },
          ],
        },
      ],
    },
  });

  console.log(`Found ${novels.length} novels to translate.`);

  for (let i = 0; i < novels.length; i++) {
    const novel = novels[i];
    console.log(`[${i + 1}/${novels.length}] Translating: ${novel.title}`);

    let titleZh = novel.titleZh || "";
    if (!titleZh) {
      titleZh = await translateText(novel.title);
      console.log(`  titleZh: ${titleZh}`);
    }

    let descriptionZh = novel.descriptionZh || "";
    if (!descriptionZh && novel.description) {
      await sleep(500);
      descriptionZh = await translateText(novel.description.slice(0, 450));
      console.log(`  descriptionZh: ${descriptionZh.slice(0, 60)}...`);
    }

    await prisma.novel.update({
      where: { id: novel.id },
      data: { titleZh, descriptionZh },
    });

    if (i < novels.length - 1) {
      await sleep(1000);
    }
  }

  console.log("Translation complete.");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
