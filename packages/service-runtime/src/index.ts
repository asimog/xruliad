import http from "node:http";

export type ServiceRouteHandler = (request: {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
  headers: http.IncomingHttpHeaders;
}) => unknown | Promise<unknown>;

export type ServiceRuntimeOptions = {
  service: string;
  role: string;
  publicSurface?: "public" | "internal" | "local_only";
  endpoints?: string[];
  capabilities?: Record<string, unknown> | (() => Record<string, unknown> | Promise<Record<string, unknown>>);
  routes?: Record<string, ServiceRouteHandler>;
  defaultPort?: number;
};

function json(res: http.ServerResponse, statusCode: number, body: unknown) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function routeKey(method: string, pathname: string) {
  return `${method.toUpperCase()} ${pathname}`;
}

function queryParams(url: URL): Record<string, string> {
  return Object.fromEntries(url.searchParams.entries());
}

async function readCapabilities(options: ServiceRuntimeOptions) {
  const configured = typeof options.capabilities === "function"
    ? await options.capabilities()
    : options.capabilities ?? {};

  return {
    service: options.service,
    role: options.role,
    publicSurface: options.publicSurface ?? "internal",
    endpoints: options.endpoints ?? ["GET /health", "GET /capabilities"],
    deploymentTarget: process.env.DEPLOYMENT_TARGET ?? "unknown",
    railway: {
      project: process.env.RAILWAY_PROJECT_NAME,
      service: process.env.RAILWAY_SERVICE_NAME,
      environment: process.env.RAILWAY_ENVIRONMENT_NAME,
      privateDomain: process.env.RAILWAY_PRIVATE_DOMAIN
    },
    ...configured
  };
}

export function startServiceRuntime(options: ServiceRuntimeOptions) {
  const port = Number(process.env.PORT ?? options.defaultPort ?? 4200);
  const host = process.env.HOST ?? "0.0.0.0";
  const startedAt = new Date();
  const routes = options.routes ?? {};

  const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const method = req.method ?? "GET";

    try {
      if (method === "GET" && url.pathname === "/health") {
        json(res, 200, {
          ok: true,
          service: options.service,
          role: options.role,
          publicSurface: options.publicSurface ?? "internal",
          uptimeSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
          startedAt: startedAt.toISOString(),
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (method === "GET" && (url.pathname === "/" || url.pathname === "/capabilities")) {
        json(res, 200, await readCapabilities(options));
        return;
      }

      const handler = routes[routeKey(method, url.pathname)];
      if (!handler) {
        json(res, 404, {
          error: "Not found",
          service: options.service,
          path: url.pathname,
          availableEndpoints: options.endpoints ?? ["GET /health", "GET /capabilities"]
        });
        return;
      }

      const body = await readBody(req);
      const result = await handler({
        method,
        path: url.pathname,
        query: queryParams(url),
        body,
        headers: req.headers
      });
      json(res, 200, result);
    } catch (err) {
      json(res, 500, {
        error: err instanceof Error ? err.message : String(err),
        service: options.service
      });
    }
  });

  server.listen(port, host, () => {
    console.log(`[${options.service}] listening on http://${host}:${port}`);
  });

  return server;
}
