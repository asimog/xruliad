import http from "node:http";
import { readQvacStatus, qvacHealth } from "@hypermyths/qvac";

const PORT = Number(process.env.PORT ?? process.env.QVAC_GATEWAY_PORT ?? 8787);
const OLLAMA_BASE = process.env.QVAC_BASE_URL ?? "http://localhost:11434/v1";

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/health") {
    const status = readQvacStatus();
    const health = await qvacHealth(status);
    res.writeHead(health.reachable ? 200 : 503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ gateway: "qvac", status: health, ollamaBase: OLLAMA_BASE, models: status.enabled ? "check Ollama for models" : "qvac disabled" }));
    return;
  }

  if (req.url === "/models") {
    try {
      const ollamaRes = await fetch(`${OLLAMA_BASE.replace(/\/v1$/, "")}/api/tags`);
      const data = await ollamaRes.json();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ gateway: "qvac", models: data }));
    } catch {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Ollama not reachable", ollamaBase: OLLAMA_BASE }));
    }
    return;
  }

  // Proxy to Ollama for all other requests
  try {
    const targetUrl = req.url?.startsWith("/v1") ? `${OLLAMA_BASE.replace(/\/v1$/, "")}${req.url}` : `${OLLAMA_BASE}${req.url}`;
    const body = req.method !== "GET" && req.method !== "HEAD" ? await readBody(req) : undefined;

    const ollamaRes = await fetch(targetUrl, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body
    });

    res.writeHead(ollamaRes.status, { "Content-Type": "application/json" });
    const text = await ollamaRes.text();
    res.end(text);
  } catch (err) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Ollama request failed", message: String(err) }));
  }
});

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => resolve(body));
  });
}

server.listen(PORT, () => {
  console.log(`QVAC Gateway running on http://localhost:${PORT}`);
  console.log(`Ollama base: ${OLLAMA_BASE}`);
});
