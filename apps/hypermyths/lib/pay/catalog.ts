export type PayShEndpointId =
  | "perplexity_search"
  | "perplexity_agent"
  | "perplexity_async_sonar"
  | "perplexity_sonar"
  | "alibaba_iqs_general_search"
  | "alibaba_iqs_enhanced_search"
  | "alibaba_iqs_unified_search"
  | "alibaba_iqs_multimodal_search"
  | "stableenrich_exa_answer"
  | "stableenrich_exa_search"
  | "stableenrich_firecrawl_search"
  | "stableenrich_serper_news"
  | "stableenrich_reddit_search"
  | "stableenrich_influencer_social"
  | "stablesocial_reddit_search"
  | "stablesocial_tiktok_search"
  | "stablesocial_instagram_search"
  | "stablesocial_facebook_search"
  | "pay_sh_video_generate"
  | "google_video_intelligence"
  | "alibaba_video_understand";

export type PayShEndpoint = {
  id: PayShEndpointId;
  label: string;
  service: string;
  baseUrl: string;
  method: "GET" | "POST";
  path: string;
  price: string;
  priceUsd: number;
  use: "web_search" | "web_inference" | "social_search" | "video_generation" | "video_analysis";
  notes: string;
};

export const PAY_SH_ENDPOINTS: PayShEndpoint[] = [
  {
    id: "perplexity_search",
    label: "Perplexity Search",
    service: "paysponge/perplexity",
    baseUrl: "https://pplx.x402.paysponge.com",
    method: "POST",
    path: "search",
    price: "$0.01/request",
    priceUsd: 0.01,
    use: "web_search",
    notes: "Grounded web search snippets and citations for current-source discovery.",
  },
  {
    id: "perplexity_agent",
    label: "Perplexity Agent Response",
    service: "paysponge/perplexity",
    baseUrl: "https://pplx.x402.paysponge.com",
    method: "POST",
    path: "v1/agent",
    price: "$0.01/request",
    priceUsd: 0.01,
    use: "web_inference",
    notes: "Agent-style grounded response for larger web-search inference passes.",
  },
  {
    id: "perplexity_async_sonar",
    label: "Perplexity Async Sonar",
    service: "paysponge/perplexity",
    baseUrl: "https://pplx.x402.paysponge.com",
    method: "POST",
    path: "v1/async/sonar",
    price: "$0.01/request",
    priceUsd: 0.01,
    use: "web_inference",
    notes: "Async deep-search kickoff for slower research runs.",
  },
  {
    id: "perplexity_sonar",
    label: "Perplexity Sonar",
    service: "paysponge/perplexity",
    baseUrl: "https://pplx.x402.paysponge.com",
    method: "POST",
    path: "v1/sonar",
    price: "free in catalog",
    priceUsd: 0,
    use: "web_inference",
    notes: "Grounded answer generation with citations when the engine needs an inference pass.",
  },
  {
    id: "alibaba_iqs_general_search",
    label: "Alibaba IQS General Search",
    service: "solana-foundation/alibaba/iqs",
    baseUrl: "https://iqs.alibaba.gateway-402.com",
    method: "GET",
    path: "linked-retrieval/linked-retrieval-entry/v2/linkedRetrieval/commands/genericSearch",
    price: "$0.001/request",
    priceUsd: 0.001,
    use: "web_search",
    notes: "Low-cost general search route for broad asset discovery.",
  },
  {
    id: "alibaba_iqs_enhanced_search",
    label: "Alibaba IQS Enhanced Search",
    service: "solana-foundation/alibaba/iqs",
    baseUrl: "https://iqs.alibaba.gateway-402.com",
    method: "GET",
    path: "linked-retrieval/linked-retrieval-entry/v2/linkedRetrieval/commands/genericAdvancedSearch",
    price: "$0.001/request",
    priceUsd: 0.001,
    use: "web_search",
    notes: "Low-cost enhanced search for source expansion.",
  },
  {
    id: "alibaba_iqs_unified_search",
    label: "Alibaba IQS Unified Search",
    service: "solana-foundation/alibaba/iqs",
    baseUrl: "https://iqs.alibaba.gateway-402.com",
    method: "POST",
    path: "linked-retrieval/linked-retrieval-entry/v1/iqs/search/unified",
    price: "$0.001/request",
    priceUsd: 0.001,
    use: "web_search",
    notes: "Unified search route for dynamic asset scanner evidence collection.",
  },
  {
    id: "alibaba_iqs_multimodal_search",
    label: "Alibaba IQS Multimodal Search",
    service: "solana-foundation/alibaba/iqs",
    baseUrl: "https://iqs.alibaba.gateway-402.com",
    method: "POST",
    path: "linked-retrieval/linked-retrieval-entry/v1/iqs/multimodal/unified",
    price: "$0.001/request",
    priceUsd: 0.001,
    use: "web_search",
    notes: "Multimodal search for assets with image or media context.",
  },
  {
    id: "stableenrich_exa_answer",
    label: "StableEnrich Exa Answer",
    service: "merit-systems/stableenrich/enrichment",
    baseUrl: "https://stableenrich.dev",
    method: "POST",
    path: "api/exa/answer",
    price: "$0.01/request",
    priceUsd: 0.01,
    use: "web_inference",
    notes: "AI-generated answers with citations. Best for thesis checks and source-backed summaries.",
  },
  {
    id: "stableenrich_exa_search",
    label: "StableEnrich Exa Search",
    service: "merit-systems/stableenrich/enrichment",
    baseUrl: "https://stableenrich.dev",
    method: "POST",
    path: "api/exa/search",
    price: "$0.01/request",
    priceUsd: 0.01,
    use: "web_search",
    notes: "Neural web search for topic discovery, competitors, context, and primary links.",
  },
  {
    id: "stableenrich_firecrawl_search",
    label: "StableEnrich Firecrawl Search",
    service: "merit-systems/stableenrich/enrichment",
    baseUrl: "https://stableenrich.dev",
    method: "POST",
    path: "api/firecrawl/search",
    price: "$0.03/request",
    priceUsd: 0.03,
    use: "web_search",
    notes: "General web search fallback, useful when neural search misses obvious public pages.",
  },
  {
    id: "stableenrich_serper_news",
    label: "StableEnrich Serper News",
    service: "merit-systems/stableenrich/enrichment",
    baseUrl: "https://stableenrich.dev",
    method: "POST",
    path: "api/serper/news",
    price: "$0.04/request",
    priceUsd: 0.04,
    use: "web_search",
    notes: "Google News-style recent coverage for catalysts, controversy, and prediction events.",
  },
  {
    id: "stableenrich_reddit_search",
    label: "StableEnrich Reddit Search",
    service: "merit-systems/stableenrich/enrichment",
    baseUrl: "https://stableenrich.dev",
    method: "POST",
    path: "api/reddit/search",
    price: "$0.02/request",
    priceUsd: 0.02,
    use: "social_search",
    notes: "Lower-cost Reddit post search for public discussion and community narratives.",
  },
  {
    id: "stableenrich_influencer_social",
    label: "StableEnrich Influencer Social",
    service: "merit-systems/stableenrich/enrichment",
    baseUrl: "https://stableenrich.dev",
    method: "POST",
    path: "api/influencer/enrich-by-social",
    price: "$0.40/request",
    priceUsd: 0.4,
    use: "social_search",
    notes: "High-cost influencer enrichment for creator/social-profile asset scans.",
  },
  {
    id: "stablesocial_reddit_search",
    label: "StableSocial Reddit Search",
    service: "merit-systems/stablesocial/social-data",
    baseUrl: "https://stablesocial.dev",
    method: "POST",
    path: "api/reddit/search",
    price: "$0.06/request",
    priceUsd: 0.06,
    use: "social_search",
    notes: "Richer Reddit search route in the social-data service.",
  },
  {
    id: "stablesocial_tiktok_search",
    label: "StableSocial TikTok Search",
    service: "merit-systems/stablesocial/social-data",
    baseUrl: "https://stablesocial.dev",
    method: "POST",
    path: "api/tiktok/search",
    price: "$0.06/request",
    priceUsd: 0.06,
    use: "social_search",
    notes: "TikTok content discovery for consumer attention and creator momentum.",
  },
  {
    id: "stablesocial_instagram_search",
    label: "StableSocial Instagram Search",
    service: "merit-systems/stablesocial/social-data",
    baseUrl: "https://stablesocial.dev",
    method: "POST",
    path: "api/instagram/search",
    price: "$0.06/request",
    priceUsd: 0.06,
    use: "social_search",
    notes: "Instagram post search for lifestyle, creator, and brand narratives.",
  },
  {
    id: "stablesocial_facebook_search",
    label: "StableSocial Facebook Search",
    service: "merit-systems/stablesocial/social-data",
    baseUrl: "https://stablesocial.dev",
    method: "POST",
    path: "api/facebook/search",
    price: "$0.06/request",
    priceUsd: 0.06,
    use: "social_search",
    notes: "Facebook keyword search for broader public and group-adjacent conversation.",
  },
  {
    id: "pay_sh_video_generate",
    label: "Alibaba Video Generate",
    service: "solana-foundation/alibaba/videoenhan",
    baseUrl: "https://videoenhan.alibaba.gateway-402.com",
    method: "POST",
    path: "generate-video",
    price: "$0.001/request",
    priceUsd: 0.001,
    use: "video_generation",
    notes: "Pay.sh-routed general video generation endpoint.",
  },
  {
    id: "google_video_intelligence",
    label: "Google Video Intelligence",
    service: "solana-foundation/google/videointelligence",
    baseUrl: "https://videointelligence.google.gateway-402.com",
    method: "POST",
    path: "v1/videos:annotate",
    price: "$0.10/request",
    priceUsd: 0.1,
    use: "video_analysis",
    notes: "Post-render video annotation, moderation, and searchable metadata.",
  },
  {
    id: "alibaba_video_understand",
    label: "Alibaba Video Understanding",
    service: "solana-foundation/alibaba/videorecog",
    baseUrl: "https://videorecog.alibaba.gateway-402.com",
    method: "POST",
    path: "understand-video-content",
    price: "$0.001/request",
    priceUsd: 0.001,
    use: "video_analysis",
    notes: "Low-cost video content understanding for asset/video quality checks.",
  },
];

export function getPayShEndpoint(id: PayShEndpointId): PayShEndpoint {
  const endpoint = PAY_SH_ENDPOINTS.find((item) => item.id === id);
  if (!endpoint) throw new Error(`Unknown Pay.sh endpoint: ${id}`);
  return endpoint;
}

export function payShEndpointUrl(endpoint: PayShEndpoint): string {
  return `${endpoint.baseUrl.replace(/\/$/, "")}/${endpoint.path.replace(/^\//, "")}`;
}
