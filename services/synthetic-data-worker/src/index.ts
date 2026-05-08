if (!process.env.OPENROUTER_API_KEY && !process.env.AI_PROVIDER_API_KEY) {
  throw new Error("Synthetic data worker requires OPENROUTER_API_KEY or AI_PROVIDER_API_KEY.");
}
console.log("CancerHawk synthetic data worker boundary ready.");
