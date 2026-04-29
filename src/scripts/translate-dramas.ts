import { prisma } from "@/lib/db";
import { translateText } from "@/lib/translate";

async function main() {
  const dramas = await prisma.drama.findMany({
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

  console.log(`Found ${dramas.length} dramas to translate.`);

  for (let i = 0; i < dramas.length; i++) {
    const drama = dramas[i];
    console.log(`[${i + 1}/${dramas.length}] Translating: ${drama.title}`);

    let titleZh = drama.titleZh || "";
    if (!titleZh) {
      titleZh = await translateText(drama.title);
      console.log(`  titleZh: ${titleZh}`);
    }

    let descriptionZh = drama.descriptionZh || "";
    if (!descriptionZh && drama.description) {
      await sleep(500);
      descriptionZh = await translateText(drama.description.slice(0, 450));
      console.log(`  descriptionZh: ${descriptionZh.slice(0, 60)}...`);
    }

    await prisma.drama.update({
      where: { id: drama.id },
      data: { titleZh, descriptionZh },
    });

    if (i < dramas.length - 1) {
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
