import { createLocalJobEnvelope, createCloudSafeFeedEnvelope, readFeedPrivacyConfig } from "./index.js";
const config = readFeedPrivacyConfig();
const localEnvelope = createLocalJobEnvelope({ title: "Private Market Analysis", jobType: "local_trade_intent", privacyTier: "private_strategy", actorId: "test-user-123" });
const cloudEnvelope = createCloudSafeFeedEnvelope({ title: "Public Thesis Created", content: "Testing public feed item", jobType: "thesis", privacyTier: "public", isPlatformPaid: true });
console.log(JSON.stringify({ config, localEnvelope, cloudEnvelope }, null, 2));
