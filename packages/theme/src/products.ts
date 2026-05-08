export type ProductId = "hypermyths" | "hypertian" | "cancerhawk" | "hyperkaon" | "polymyths";

export type ProductToken = {
  id: ProductId;
  displayName: string;
  domain: string;
  shortDescription: string;
  role: string;
  accent: string;
  accentSoft: string;
  backgroundVariant: ProductId;
  primaryCta: { label: string; href: string };
  navLinks: Array<{ label: string; href: string }>;
  metadata: {
    tone: string[];
    marketDoor: string;
    publicClaimGuard?: string;
  };
};

export const products: Record<ProductId, ProductToken> = {
  hypermyths: {
    id: "hypermyths",
    displayName: "HyperMyths",
    domain: "hypermyths.com",
    shortDescription: "Gateway, token scanner, AI media engine, wallet and profile intelligence.",
    role: "Main ecosystem gateway and market intelligence/media hub.",
    accent: "#49c5b6",
    accentSoft: "rgba(73,197,182,0.18)",
    backgroundVariant: "hypermyths",
    primaryCta: { label: "Open Studio", href: "/media" },
    navLinks: [
      { label: "Media", href: "/media" },
      { label: "Scanner", href: "/chat" },
      { label: "Feed", href: "/feed" },
      { label: "Music", href: "/music" }
    ],
    metadata: {
      tone: ["mythic", "crypto-native", "market intelligence", "media engine"],
      marketDoor: "attention, intelligence, research, simulation, and computation"
    }
  },
  hypertian: {
    id: "hypertian",
    displayName: "Hypertian",
    domain: "hypertian.com",
    shortDescription: "Livestream advertising, creator monetization, transparent ad overlays.",
    role: "Attention market and livestream ad rail.",
    accent: "#7ce4d2",
    accentSoft: "rgba(124,228,210,0.18)",
    backgroundVariant: "hypertian",
    primaryCta: { label: "Create Stream", href: "/streamer" },
    navLinks: [
      { label: "Streamer", href: "/streamer" },
      { label: "Directory", href: "/directory" },
      { label: "Feed", href: "/feed" },
      { label: "Music", href: "/music" }
    ],
    metadata: {
      tone: ["creator-first", "commercial", "transparent advertising"],
      marketDoor: "attention market"
    }
  },
  cancerhawk: {
    id: "cancerhawk",
    displayName: "CancerHawk",
    domain: "cancerhawk.org",
    shortDescription: "Biomedical synthetic data quests and careful research contribution workflows.",
    role: "Biomedical research and synthetic data quest market.",
    accent: "#5eead4",
    accentSoft: "rgba(94,234,212,0.16)",
    backgroundVariant: "cancerhawk",
    primaryCta: { label: "Run Research", href: "/run-research" },
    navLinks: [
      { label: "Current Block", href: "/current-block" },
      { label: "Previous Blocks", href: "/previous-blocks" },
      { label: "Run Research", href: "/run-research" },
      { label: "Music", href: "/music" }
    ],
    metadata: {
      tone: ["research-oriented", "public-good", "careful"],
      marketDoor: "biomedical research market",
      publicClaimGuard: "No clinical, treatment, diagnosis, or efficacy claims."
    }
  },
  hyperkaon: {
    id: "hyperkaon",
    displayName: "HyperKaon",
    domain: "hyperkaon.com",
    shortDescription: "Physics simulation and compute quest engine for synthetic physical-world data.",
    role: "Physics simulation and compute quest market.",
    accent: "#93c5fd",
    accentSoft: "rgba(147,197,253,0.18)",
    backgroundVariant: "hyperkaon",
    primaryCta: { label: "Open Simulations", href: "/quests" },
    navLinks: [
      { label: "Quests", href: "/quests" },
      { label: "Physics Engine", href: "/physics" },
      { label: "Compute Market", href: "/compute" },
      { label: "Data", href: "/data" }
    ],
    metadata: {
      tone: ["physics-native", "technical", "scientific"],
      marketDoor: "physics simulation and compute market"
    }
  },
  polymyths: {
    id: "polymyths",
    displayName: "Polymyths",
    domain: "polymyths.com",
    shortDescription: "Narrative intelligence, prediction, scenario analysis, and market hypotheses.",
    role: "Prediction, intelligence, scenario, and narrative market layer.",
    accent: "#f5c542",
    accentSoft: "rgba(245,197,66,0.16)",
    backgroundVariant: "polymyths",
    primaryCta: { label: "Create Thesis", href: "/theses" },
    navLinks: [
      { label: "Theses", href: "/theses" },
      { label: "Scenarios", href: "/scenarios" },
      { label: "Signals", href: "/signals" },
      { label: "Markets", href: "/markets" }
    ],
    metadata: {
      tone: ["intelligence", "prediction", "scenario analysis", "finance"],
      marketDoor: "prediction and intelligence market"
    }
  }
};

export const productDomainMap = Object.fromEntries(
  Object.values(products).map((product) => [product.domain, product.id])
) as Record<string, ProductId>;

export function getProduct(id: ProductId): ProductToken {
  return products[id];
}
