import type { CinemaPageId } from "@/lib/cinema/config";
import { X_PROFILE_TWEET_LIMIT } from "@/lib/x/constants";

export type HyperMythsCategory = {
  id: CinemaPageId;
  title: string;
  summary: string;
  href: string;
};

export type TrendingSpotlight = {
  title: string;
  promise: string;
  category: string;
  tags: string[];
  startingPrice: string;
  href: string;
};

/** Primary 4 hero categories shown on the homepage 2x2 grid. */
export const HYPERMYTHS_HERO_CATEGORIES: HyperMythsCategory[] = [
  {
    id: "mythx",
    title: "Profile Cinema",
    summary: `Turn the latest ${X_PROFILE_TWEET_LIMIT} posts from any X profile into a sharp two-act trailer.`,
    href: "/media",
  },
  {
    id: "lovex",
    title: "LoveX",
    summary: "Family occasions, reunion reels, birthdays, and keepsakes cut like cinema.",
    href: "/LoveX",
  },
  {
    id: "hashmyth",
    title: "HashMyth",
    summary: "Turn any wallet or memecoin into a cinematic story shaped by on-chain signals.",
    href: "/HashMyth",
  },
  {
    id: "hyperm",
    title: "HyperM",
    summary: "Polished concept films, brand stories, and tighter creative control for serious launches.",
    href: "/HyperM",
  },
];

/** All categories including legacy/deprecated ones surfaced in Trending. */
export const HYPERMYTHS_CATEGORIES: HyperMythsCategory[] = [
  {
    id: "mythx",
    title: "Profile Cinema",
    summary: `Turn the latest ${X_PROFILE_TWEET_LIMIT} posts from any X profile into a sharp two-act trailer.`,
    href: "/media",
  },
  {
    id: "lovex",
    title: "LoveX",
    summary: "Family occasions, reunion reels, birthdays, and keepsakes cut like cinema.",
    href: "/LoveX",
  },
  {
    id: "hashmyth",
    title: "HashMyth",
    summary: "Turn any wallet or memecoin into a cinematic story shaped by on-chain signals.",
    href: "/HashMyth",
  },
  {
    id: "hyperm",
    title: "HyperM",
    summary: "Polished concept films, brand stories, and tighter creative control for serious launches.",
    href: "/HyperM",
  },
  {
    id: "funcinema",
    title: "FunMyths",
    summary: "Random and weird cinematic experiments with a playful edge.",
    href: "/FunCinema",
  },
  {
    id: "trenchcinema",
    title: "TrenchMyths",
    summary: "Memecoin stories, wallets, and token-led cinematic drops.",
    href: "/TrenchCinema",
  },
  {
    id: "familycinema",
    title: "Family",
    summary: "Occasions, family photos, and private keepsakes with warmth.",
    href: "/FamilyCinema",
  },
  {
    id: "musicvideo",
    title: "Music",
    summary: "Music-led edits, remakes, and rhythm-first visual stories.",
    href: "/MusicVideo",
  },
];

export const TRENDING_SPOTLIGHTS: TrendingSpotlight[] = [
  {
    title: "Me & Waifu",
    promise: "Cute, chaotic, and highly shareable couple energy.",
    category: "TrenchMyths",
    tags: ["wallet", "romance", "public"],
    startingPrice: "0.004 SOL",
    href: "/TrenchCinema",
  },
  {
    title: "Birthday for Mom",
    promise: "Warm family celebration with a polished emotional finish.",
    category: "Family",
    tags: ["gift", "celebration", "private"],
    startingPrice: "1 USDC",
    href: "/FamilyCinema",
  },
  {
    title: "Old Family Photos to Video",
    promise: "Turn still memories into a moving keepsake.",
    category: "Family",
    tags: ["archive", "nostalgia", "story"],
    startingPrice: "1 USDC",
    href: "/FamilyCinema",
  },
  {
    title: "Anniversary Music Montage",
    promise: "A sentimental edit synced to the song that matters.",
    category: "Music",
    tags: ["music-led", "romantic", "montage"],
    startingPrice: "0.007 SOL",
    href: "/MusicVideo",
  },
  {
    title: "Sorry Video",
    promise: "Sincere, direct, and designed to land the apology cleanly.",
    category: "FunMyths",
    tags: ["private", "message", "short"],
    startingPrice: "1 USDC",
    href: "/FunCinema",
  },
  {
    title: "Kids Story",
    promise: "Gentle bedtime pacing with soft visuals and narration only when requested.",
    category: "Family",
    tags: ["kids", "narration-optional", "safe"],
    startingPrice: "1 USDC",
    href: "/FamilyCinema",
  },
  {
    title: "Memorial Tribute",
    promise: "Respectful remembrance with a cinematic finish.",
    category: "Family",
    tags: ["tribute", "memory", "calm"],
    startingPrice: "1 USDC",
    href: "/FamilyCinema",
  },
];
