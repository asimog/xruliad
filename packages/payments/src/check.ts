import { PayShClient, readPayShConfig } from "./index";

const config = readPayShConfig();
const missing: string[] = [];
if (!config.walletPrivateKey && !config.sandbox) missing.push("PAYSH_WALLET_PRIVATE_KEY");

try {
  new PayShClient(config).quotePaidRequest({
    provider: "payment-debugger",
    url: "https://payment-debugger.vercel.app/mpp/quote/AAPL",
    method: "GET",
    estimatedCostUsd: 0
  });
  console.log("pay.sh boundary configured.");
  if (missing.length) console.log(`Missing for live payments: ${missing.join(", ")}`);
  console.log(`Command: ${config.command}; sandbox: ${config.sandbox}; network: ${config.network}; currency: ${config.defaultCurrency}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
