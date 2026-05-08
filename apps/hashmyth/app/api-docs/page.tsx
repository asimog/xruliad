export default function ApiDocsPage() {
  const endpoints = [
    { method: "GET", path: "/api/health", desc: "Service health check" },
    { method: "GET", path: "/api/capabilities", desc: "Product capabilities and agent tools" },
    { method: "GET", path: "/api/feed", desc: "HashMyth product feed" },
    { method: "POST", path: "/api/agent/run", desc: "Execute agent tool" },
    { method: "POST", path: "/api/jobs", desc: "Create a video job" },
    { method: "GET", path: "/api/jobs/:id", desc: "Get job status" },
    { method: "POST", path: "/api/quote", desc: "Quote a paid action" },
    { method: "POST", path: "/api/execute", desc: "Prepare execution intent (web_prepare_only)" },
    { method: "POST", path: "/api/video/script", desc: "Generate video from script" },
    { method: "POST", path: "/api/video/generate", desc: "Generate video from prompt" },
    { method: "POST", path: "/api/video/from-token", desc: "Generate video from token address" },
    { method: "POST", path: "/api/video/from-wallet", desc: "Generate video from wallet address" },
    { method: "POST", path: "/api/video/from-x-profile", desc: "Generate video from X profile" },
    { method: "POST", path: "/api/video/from-market-thesis", desc: "Generate video from market thesis" },
    { method: "POST", path: "/api/video/from-research-report", desc: "Generate video from research report" },
    { method: "POST", path: "/api/video/from-simulation", desc: "Generate video from simulation" },
    { method: "POST", path: "/api/video/from-ad-campaign", desc: "Generate video from ad campaign" },
    { method: "GET", path: "/api/video/jobs/:id", desc: "Get video job status" },
    { method: "POST", path: "/api/video/jobs/:id/cancel", desc: "Cancel video job" }
  ];

  return (
    <main style={{ minHeight: "100vh", padding: "96px 24px", color: "#e9efff", background: "#0a0a1a" }}>
      <h1>HashMyth API Documentation</h1>
      <p style={{ color: "rgba(233,239,255,0.7)" }}>
        All endpoints are agent-callable. Base URL: <code>https://hashmyth.com</code>
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1.5rem", fontSize: "0.85rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(167,139,250,.3)", textAlign: "left" }}>
            <th style={{ padding: "8px 12px", color: "#a78bfa" }}>Method</th>
            <th style={{ padding: "8px 12px", color: "#a78bfa" }}>Path</th>
            <th style={{ padding: "8px 12px", color: "#a78bfa" }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {endpoints.map((ep) => (
            <tr key={ep.path} style={{ borderBottom: "1px solid rgba(167,139,250,.1)" }}>
              <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#5eead4" }}>{ep.method}</td>
              <td style={{ padding: "8px 12px", fontFamily: "monospace", color: "#e9efff" }}>{ep.path}</td>
              <td style={{ padding: "8px 12px", color: "rgba(233,239,255,0.7)" }}>{ep.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
