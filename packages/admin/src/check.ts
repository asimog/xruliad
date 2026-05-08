import { adminOverview, checkAdminAuth, ADMIN_SECTIONS, getAdminTools } from "./index.js";

const overview = adminOverview({ openRouterConfigured: false, payShConfigured: false, supabaseConfigured: false, hermesWorkerOnline: false });
console.log("[admin] overview:", JSON.stringify(overview, null, 2));

const authNoConfig = checkAdminAuth({});
console.log("[admin] auth (no config):", JSON.stringify(authNoConfig, null, 2));

const authWithEmail = checkAdminAuth({ emails: ["admin@hypermyths.com"], userEmail: "admin@hypermyths.com" });
console.log("[admin] auth (valid email):", JSON.stringify(authWithEmail, null, 2));

const sections = ADMIN_SECTIONS.map((s) => s.id);
console.log("[admin] sections:", sections.length, "sections");

const tools = getAdminTools("hypermyths");
console.log("[admin] terminal tools:", tools);

console.log("[admin] check passed");
