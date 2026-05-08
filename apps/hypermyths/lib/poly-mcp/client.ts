type PolyClient = {
  callTool: (tool: string, payload: Record<string, unknown>) => Promise<unknown>;
};

export function getPolyMCPClient(): PolyClient {
  return {
    async callTool(tool: string) {
      throw new Error(`Poly MCP is not configured (tool: ${tool}).`);
    },
  };
}
