if (!process.env.VIDEO_SERVICE_BASE_URL && !process.env.OPENROUTER_API_KEY) {
  throw new Error("Video worker requires VIDEO_SERVICE_BASE_URL or a configured video provider key.");
}
console.log("Video worker boundary ready.");
