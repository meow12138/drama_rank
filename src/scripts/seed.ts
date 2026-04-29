import { prisma } from "@/lib/db";

// 从 FlexTV 抓取的真实短剧数据（URL 真实可访问）
// 后续部署到海外服务器后，可通过 scraper.ts 补充 ReelShort、ShortTV 等平台数据
const seedDramas = [
  {
    title: "The Tiny Tyrant of Go (Dubbed)",
    platform: "FlexTV",
    tags: "Historical, Power Struggle, Fantasy",
    chartType: "hot",
    score: 4.8,
    url: "https://www.flextv.cc/episodes/episode-1-the-tiny-tyrant-of-go-dubbed-WKzLolDOr0",
    cover: "",
    description: "A young tyrant rises to power in the ancient kingdom of Go, facing betrayal and war at every turn.",
  },
  {
    title: "Engineering My Kingdom",
    platform: "FlexTV",
    tags: "Historical, Strategy, Romance",
    chartType: "hot",
    score: 4.7,
    url: "https://www.flextv.cc/episodes/episode-1-engineering-my-kingdom-MPOxyPVzqX",
    cover: "",
    description: "A modern engineer is reborn in ancient times and uses his knowledge to build an empire from scratch.",
  },
  {
    title: "Justice in Blood (Dubbed)",
    platform: "FlexTV",
    tags: "Revenge, Legal, Thriller",
    chartType: "hot",
    score: 4.6,
    url: "https://www.flextv.cc/episodes/episode-1-justice-in-blood-dubbed-mEZqoBAz8Q",
    cover: "",
    description: "A lawyer returns from the dead to seek vengeance against the corrupt system that destroyed his family.",
  },
  {
    title: "Choosing the Devil Over You",
    platform: "FlexTV",
    tags: "Romance, Dark Love, Heiress",
    chartType: "hot",
    score: 4.9,
    url: "https://www.flextv.cc/episodes/episode-1-choosing-the-devil-over-you-r0OB5MkZXA",
    cover: "",
    description: "An heiress must choose between her childhood sweetheart and a dangerous man who offers her everything.",
  },
  {
    title: "The Dropout with a Bodycount",
    platform: "FlexTV",
    tags: "Action, Revenge, Underdog",
    chartType: "rising",
    score: 4.5,
    url: "https://www.flextv.cc/episodes/episode-1-the-dropout-with-a-bodycount-DAONjEaOPR",
    cover: "",
    description: "A high-school dropout discovers he has a deadly skillset and uses it to dismantle a criminal empire.",
  },
  {
    title: "See No Evil, Marry the Killer",
    platform: "FlexTV",
    tags: "Thriller, Mystery, Marriage",
    chartType: "rising",
    score: 4.6,
    url: "https://www.flextv.cc/episodes/episode-1-see-no-evil-marry-the-killer-wQOAq5gO7W",
    cover: "",
    description: "A blind woman unknowingly marries a notorious hitman, and their dangerous romance threatens to expose his past.",
  },
  {
    title: "Rise of the Dragon King",
    platform: "FlexTV",
    tags: "Fantasy, Cultivation, Royalty",
    chartType: "hot",
    score: 4.7,
    url: "https://www.flextv.cc/episodes/episode-1-rise-of-the-dragon-king-wQOAEy7O7W",
    cover: "",
    description: "The last heir of the dragon bloodline awakens his power and challenges the heavens to reclaim his throne.",
  },
  {
    title: "Too Rich to Be Your Charity",
    platform: "FlexTV",
    tags: "Romance, Hidden Identity, Billionaire",
    chartType: "rising",
    score: 4.4,
    url: "https://www.flextv.cc/episodes/episode-1-too-rich-to-be-your-charity-J9zDvJyZ1x",
    cover: "",
    description: "A billionaire pretends to be broke to test his girlfriend, only to find she was using him all along.",
  },
  {
    title: "Dead Love, Rising Power",
    platform: "FlexTV",
    tags: "Family, Revenge, Power",
    chartType: "hot",
    score: 4.6,
    url: "https://www.flextv.cc/episodes/episode-1-dead-love-rising-power-EMOJwrMzLa",
    cover: "",
    description: "After her family's betrayal leaves her for dead, she returns with a new identity to seize control of their empire.",
  },
  {
    title: "The Demon Devourer",
    platform: "FlexTV",
    tags: "Fantasy, Horror, Supernatural",
    chartType: "rising",
    score: 4.5,
    url: "https://www.flextv.cc/episodes/episode-1-the-demon-devourer-J9zDkmEO1x",
    cover: "",
    description: "A cursed warrior must consume demons to survive, but each battle brings him closer to becoming one himself.",
  },
  {
    title: "One Night Stand",
    platform: "FlexTV",
    tags: "Romance, Comedy, Accidental Love",
    chartType: "hot",
    score: 4.3,
    url: "https://www.flextv.cc/episodes/episode-1-one-night-stand-EqOERrgzNr",
    cover: "",
    description: "A drunken mistake leads to an unexpected pregnancy, forcing two strangers into a chaotic fake marriage.",
  },
  {
    title: "Leaving the Leeches Behind",
    platform: "FlexTV",
    tags: "Revenge, Family, Drama",
    chartType: "rising",
    score: 4.7,
    url: "https://www.flextv.cc/episodes/episode-1-leaving-the-leeches-behind-wQOAEQWO7W",
    cover: "",
    description: "Fed up with being exploited by her own family, she cuts them off and builds a fortune they can only dream of.",
  },
  {
    title: "My Handsome Bodyguard",
    platform: "FlexTV",
    tags: "Romance, Action, Contract Couple",
    chartType: "hot",
    score: 4.8,
    url: "https://www.flextv.cc/episodes/episode-1-my-handsome-bodyguard-jGnvM9vzky",
    cover: "",
    description: "A celebrity hires a mysterious bodyguard, not knowing he is the heir to a powerful crime syndicate.",
  },
  {
    title: "Unleashing the Dragon: Day One",
    platform: "FlexTV",
    tags: "Contemporary, Cultivation, Urban",
    chartType: "rising",
    score: 4.5,
    url: "https://www.flextv.cc/episodes/episode-1-unleashing-the-dragon-day-one-J9zDkDrO1x",
    cover: "",
    description: "On the first day of his awakening, a ordinary office worker discovers he is the reincarnation of an ancient dragon god.",
  },
  {
    title: "Flipping the Script at 52",
    platform: "FlexTV",
    tags: "Inspirational, Midlife, Romance",
    chartType: "hot",
    score: 4.6,
    url: "https://www.flextv.cc/episodes/episode-1-flipping-the-script-at-52-5ezeae8zPp",
    cover: "",
    description: "At 52, a housewife decides she has had enough and reinvents herself as a top business executive.",
  },
];

async function seed() {
  console.log("Seeding dramas with real FlexTV data...");
  let count = 0;
  for (const drama of seedDramas) {
    await prisma.drama.upsert({
      where: { url: drama.url },
      update: drama,
      create: drama,
    });
    count++;
  }
  console.log(`Seeded ${count} dramas.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
