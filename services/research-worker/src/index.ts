import { createResearchQuest } from "@hypermyths/intelligence";
console.log(JSON.stringify({ service: "research-worker", demo: createResearchQuest({ productId: "cancerhawk", title: "safe research quest", prompt: "Generate a dataset task; no treatment claims.", safetyNotes: ["No clinical or treatment claims."] }) }, null, 2));
