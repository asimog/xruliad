type DexterClient = {
  resolveToken: (token: string) => Promise<unknown>;
  previewSwap: (input: string, output: string, amount: number) => Promise<unknown>;
  getJupiterQuote: (input: string, output: string, amount: number) => Promise<unknown>;
  checkBalance: (wallet: string) => Promise<unknown>;
  getTrendingTokens: (timeframe?: string) => Promise<unknown>;
  analyzeWallet: (wallet: string) => Promise<unknown>;
  searchPumpfun: (query: string) => Promise<unknown>;
  webSearch: (query: string) => Promise<unknown>;
  fetchUrl: (url: string) => Promise<unknown>;
  getOHLCV: (pair: string) => Promise<unknown>;
  hyperliquidTrade: (
    ticker: string,
    side: "buy" | "sell",
    size: number,
  ) => Promise<unknown>;
};

function notConfigured(tool: string): never {
  throw new Error(`Dexter MCP is not configured (tool: ${tool}).`);
}

export function getDexterMCPClient(): DexterClient {
  return {
    resolveToken: async () => notConfigured("resolveToken"),
    previewSwap: async () => notConfigured("previewSwap"),
    getJupiterQuote: async () => notConfigured("getJupiterQuote"),
    checkBalance: async () => notConfigured("checkBalance"),
    getTrendingTokens: async () => notConfigured("getTrendingTokens"),
    analyzeWallet: async () => notConfigured("analyzeWallet"),
    searchPumpfun: async () => notConfigured("searchPumpfun"),
    webSearch: async () => notConfigured("webSearch"),
    fetchUrl: async () => notConfigured("fetchUrl"),
    getOHLCV: async () => notConfigured("getOHLCV"),
    hyperliquidTrade: async () => notConfigured("hyperliquidTrade"),
  };
}
