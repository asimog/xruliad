"use client";

import { useEffect, useState } from "react";

import { UnifiedRouteShell } from "@/components/shell/UnifiedRouteShell";

type ProviderStatus = "ok" | "disabled" | "missing_cli" | "error";

type AssetAnalysisResult = {
  topic: string;
  normalizedTopic: string;
  generatedAt: string;
  jobId?: string | null;
  engine: {
    summary: string;
    motoStatus: ProviderStatus;
    miroSharkStatus: ProviderStatus;
    payShStatus: ProviderStatus;
  };
  providerStatus: {
    paySh: ProviderStatus;
    webSearch: ProviderStatus;
    socialSearch: ProviderStatus;
    inference: ProviderStatus;
    moto: ProviderStatus;
    miroShark: ProviderStatus;
  };
  categories: {
    technical: string[];
    market: string[];
    thesis: string[];
    public: string[];
    prediction: string[];
  };
  risk: {
    score: number;
    label: "Lower" | "Medium" | "High" | "Unknown";
    flags: string[];
  };
  article: {
    title: string;
    summary: string[];
    story: string[];
  };
  moto: {
    acceptedSubmissions: string[];
  };
  miroShark: {
    marketPrice: number;
    headlineCatalysts: string[];
    opinions: Array<{
      archetypeId: string;
      archetypeName: string;
      stance: string;
      confidence: number;
      verdict: string;
      catalyst: string;
    }>;
  };
  sources: {
    payShEndpoints: Array<{
      service: string;
      endpoint: string;
      url: string;
      price: string;
      status: string;
      notes: string;
    }>;
    evidence: Array<{
      id: string;
      provider: string;
      title: string;
      url: string | null;
      snippet: string;
      status: string;
    }>;
  };
};

type AssetScanCheckout = {
  jobId: string;
  status: "awaiting_payment";
  topic: string;
  payment: {
    rail: "solana_sol" | "x402_usdc";
    paymentAddress: string | null;
    amountSol: number;
    amountUsdc: number;
    requiredLamports: string;
    x402Url: string | null;
  };
  quote: {
    quoteId: string;
    totalUsd: number;
    totalSol: number;
    totalLamports: string;
    expiresAt: string;
    operations: Array<{
      endpointId: string;
      label: string;
      calls: number;
      totalUsd: number;
    }>;
  };
};

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new Error("Asset scan request failed.");
  return payload as T;
}

function CategoryBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="ux-analysis-block">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function AssetScanCard({ result }: { result: AssetAnalysisResult | null }) {
  if (!result) return null;

  const riskTone =
    result.risk.label === "Lower"
      ? "ux-scan-risk--lower"
      : result.risk.label === "Medium"
        ? "ux-scan-risk--medium"
        : "ux-scan-risk--high";

  return (
    <section className="ux-scan-card" aria-label="Asset scan result">
      <div className="ux-scan-head">
        <div className="ux-scan-token">
          <span className="ux-scan-logo ux-scan-logo--empty" aria-hidden="true" />
          <div>
            <h2>{result.article.title}</h2>
            <p>{result.normalizedTopic}</p>
          </div>
        </div>
        <span className={`ux-scan-risk ${riskTone}`}>{result.risk.label}</span>
      </div>

      <div className="ux-scan-metrics">
        <div>
          <span>MiroShark Price</span>
          <strong>{result.miroShark.marketPrice.toFixed(2)}</strong>
        </div>
        <div>
          <span>MOTO Lanes</span>
          <strong>{result.moto.acceptedSubmissions.length}</strong>
        </div>
        <div>
          <span>Evidence</span>
          <strong>{result.sources.evidence.length}</strong>
        </div>
        <div>
          <span>Pay.sh</span>
          <strong>{result.providerStatus.paySh}</strong>
        </div>
      </div>

      <p className="ux-copy">{result.engine.summary}</p>

      {result.risk.flags.length ? (
        <div className="ux-scan-flags">
          {result.risk.flags.map((flag) => (
            <span key={flag}>{flag}</span>
          ))}
        </div>
      ) : null}

      <div className="ux-analysis-grid">
        <CategoryBlock title="Technical Analysis" items={result.categories.technical} />
        <CategoryBlock title="Market Analysis" items={result.categories.market} />
        <CategoryBlock title="Thesis Analysis" items={result.categories.thesis} />
        <CategoryBlock title="Public Analysis" items={result.categories.public} />
        <CategoryBlock title="Prediction Analysis" items={result.categories.prediction} />
      </div>
    </section>
  );
}

function OpinionsCard({ result }: { result: AssetAnalysisResult | null }) {
  if (!result) return null;
  return (
    <article className="ux-article-card" aria-label="Archetype opinions">
      <h2>MiroShark Opinions</h2>
      {result.miroShark.opinions.map((opinion) => (
        <section key={opinion.archetypeId} className="ux-analysis-block">
          <h3>
            {opinion.archetypeName} · {opinion.stance} ·{" "}
            {Math.round(opinion.confidence * 100)}%
          </h3>
          <p>{opinion.verdict}</p>
          <p className="ux-copy">{opinion.catalyst}</p>
        </section>
      ))}
    </article>
  );
}

function EvidenceCard({ result }: { result: AssetAnalysisResult | null }) {
  if (!result) return null;
  return (
    <article className="ux-article-card" aria-label="Research evidence">
      <h2>Pay.sh Research</h2>
      {result.sources.evidence.length ? (
        <div className="ux-tweet-stack">
          {result.sources.evidence.map((item) => (
            <a
              key={item.id}
              href={item.url ?? item.provider}
              target="_blank"
              rel="noopener noreferrer"
              className="ux-tweet-card"
            >
              <strong>{item.title}</strong>
              <span>{item.provider}</span>
              <p>{item.snippet}</p>
            </a>
          ))}
        </div>
      ) : (
        <p className="ux-copy">
          No live Pay.sh evidence was returned. Enable Pay.sh locally or in the
          runtime to populate web and social sources.
        </p>
      )}
    </article>
  );
}

export default function AssetScannerPage() {
  const [input, setInput] = useState("");
  const [payerAddress, setPayerAddress] = useState("");
  const [paymentSignature, setPaymentSignature] = useState("");
  const [scanning, setScanning] = useState(false);
  const [checkout, setCheckout] = useState<AssetScanCheckout | null>(null);
  const [lastScan, setLastScan] = useState<AssetAnalysisResult | null>(null);

  useEffect(() => {
    document.body.classList.add("show");
    return () => {
      document.body.classList.remove("show");
    };
  }, []);

  async function scanAsset() {
    const value = input.trim();
    if (!value || scanning) return;

    setScanning(true);
    try {
      const response = await fetch("/api/asset/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic: value }),
      });
      const result = await parseJson<AssetScanCheckout>(response);
      setCheckout(result);
      setLastScan(null);
      setInput("");
    } finally {
      setScanning(false);
    }
  }

  async function confirmPayment() {
    if (!checkout || !payerAddress.trim()) return;
    const response = await fetch(`/api/pay-sh/jobs/${checkout.jobId}/confirm-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        rail: checkout.payment.rail,
        payerAddress: payerAddress.trim(),
        signature:
          checkout.payment.rail === "solana_sol" ? paymentSignature.trim() : undefined,
        x402Transaction:
          checkout.payment.rail === "x402_usdc" ? paymentSignature.trim() : undefined,
      }),
    });
    await parseJson(response);
    window.location.href = `/job/${checkout.jobId}`;
  }

  return (
    <UnifiedRouteShell
      eyebrow="Asset Scanner"
      title="HyperMyths Asset Scanner"
      subtitle="Analyze any topic, asset, or prediction with web search, social search, MOTO, and MiroShark"
    >
      <div className="ux-stack" style={{ maxWidth: "840px" }}>
        <div className="ux-input-row">
          <input
            className="ux-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void scanAsset();
              }
            }}
            placeholder="Enter any token, company, project, event, thesis, or prediction"
            aria-label="Asset scan topic"
            disabled={scanning}
          />
          <button
            type="button"
            className="ux-btn ux-btn--primary"
            onClick={() => void scanAsset()}
            disabled={scanning || input.trim().length === 0}
          >
            {scanning ? "Scanning..." : "Scan"}
          </button>
        </div>

        {checkout ? (
          <section className="ux-scan-card" aria-label="Pay.sh checkout">
            <div className="ux-scan-head">
              <div>
                <h2>Pay.sh Checkout</h2>
                <p>{checkout.topic}</p>
              </div>
              <span className="ux-scan-risk ux-scan-risk--medium">
                ${checkout.quote.totalUsd.toFixed(3)}
              </span>
            </div>
            <div className="ux-scan-metrics">
              <div>
                <span>SOL</span>
                <strong>{checkout.payment.amountSol.toFixed(6)}</strong>
              </div>
              <div>
                <span>USDC</span>
                <strong>{checkout.payment.amountUsdc.toFixed(3)}</strong>
              </div>
              <div>
                <span>Calls</span>
                <strong>
                  {checkout.quote.operations.reduce((sum, item) => sum + item.calls, 0)}
                </strong>
              </div>
              <div>
                <span>Rail</span>
                <strong>{checkout.payment.rail}</strong>
              </div>
            </div>
            {checkout.payment.paymentAddress ? (
              <p className="ux-copy">
                Pay {checkout.payment.amountSol.toFixed(6)} SOL to{" "}
                <code>{checkout.payment.paymentAddress}</code>, then paste the sender wallet
                and transaction signature.
              </p>
            ) : (
              <p className="ux-copy">
                x402 payment required. Submit the payer address and x402 transaction proof.
              </p>
            )}
            <div className="ux-input-row">
              <input
                className="ux-input"
                value={payerAddress}
                onChange={(event) => setPayerAddress(event.target.value)}
                placeholder="Payer wallet or x402 payer"
                aria-label="Payer address"
              />
              <input
                className="ux-input"
                value={paymentSignature}
                onChange={(event) => setPaymentSignature(event.target.value)}
                placeholder="Payment signature or x402 proof"
                aria-label="Payment signature"
              />
              <button
                type="button"
                className="ux-btn ux-btn--primary"
                onClick={() => void confirmPayment()}
              >
                Confirm
              </button>
            </div>
          </section>
        ) : null}

        <AssetScanCard result={lastScan} />
        <OpinionsCard result={lastScan} />
        <EvidenceCard result={lastScan} />
      </div>
    </UnifiedRouteShell>
  );
}
