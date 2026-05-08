# ElizaCloud MCP Server

This project now includes an MCP server entry for ElizaCloud:

- URL: `https://www.elizacloud.ai/api/mcp`
- Auth header: `Authorization: Bearer ${ELIZA_API_KEY}`

## Config File

The repo-level config is in:

- `.mcp.json`

## Required Environment Variable

Set this in every environment that needs MCP access:

```bash
ELIZA_API_KEY=eliza_...
```

## Notes

- This is the **X API** project for tweets and the **ElizaCloud API** project for generation.
- The MCP endpoint is separate from Eliza REST endpoints like `/api/v1/chat` and `/api/v1/generate-video`.
