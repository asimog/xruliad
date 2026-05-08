import { z } from "zod";

import { generateTextInferenceJson } from "@/lib/inference/text";
import { collectPayShEvidence } from "./pay-research";
import type { AssetAnalysisResult, AssetEvidenceItem, AssetOpinion } from "./types";

type MotoSubmission = {
  submission: string;
  thesis: string;
  evidenceRefs: string[];
};

type MotoDecision = {
  decision: "accept" | "reject";
  reasoning: string;
  steeringFeedback: string;
  scores: {
    novelty: number;
    evidenceUse: number;
    predictiveUsefulness: number;
  };
};

const MOTO_SUBMITTER_COUNT = 3;

const ARCHETYPES = [
  {
    id: "market_maker",
    name: "Market Maker",
    brief: "Prices the opportunity as a live prediction market.",
  },
  {
    id: "skeptic",
    name: "Skeptic",
    brief: "Looks for weak evidence, hype loops, and downside surprises.",
  },
  {
    id: "social_listener",
    name: "Social Listener",
    brief: "Reads communities, social platforms, memes, and attention quality.",
  },
  {
    id: "technical_operator",
    name: "Technical Operator",
    brief: "Checks execution details, product surface, chain data, and implementation reality.",
  },
  {
    id: "prediction_trader",
    name: "Prediction Trader",
    brief: "Turns the evidence into time-boxed forecasts and falsifiable conditions.",
  },
  {
    id: "narrative_editor",
    name: "Narrative Editor",
    brief: "Identifies the story people will repeat or reject.",
  },
  {
    id: "risk_analyst",
    name: "Risk Analyst",
    brief: "Flags security, legal, market, social, and information risks.",
  },
  {
    id: "builder",
    name: "Builder",
    brief: "Asks what action the research implies for product, investment, or strategy.",
  },
] as const;

function normalizeTopic(topic: string): string {
  return topic.trim().replace(/\s+/g, " ").slice(0, 240);
}

function evidenceDigest(evidence: AssetEvidenceItem[]): string {
  if (!evidence.length) return "No Pay.sh evidence was available. Make conservative uncertainty explicit.";
  return evidence
    .slice(0, 12)
    .map((item, index) => {
      const url = item.url ? ` (${item.url})` : "";
      return `[${index + 1}] ${item.provider}: ${item.title}${url}\n${item.snippet}`;
    })
    .join("\n\n");
}

function safeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  return items.length ? items.slice(0, 5) : fallback;
}

async function generateMotoSubmission(input: {
  topic: string;
  evidence: string;
  index: number;
  accepted: string[];
  rejected: string[];
}): Promise<MotoSubmission> {
  const fallback: MotoSubmission = {
    submission:
      `Research lane ${input.index + 1}: ${input.topic} needs live source confirmation, social signal separation, and a falsifiable prediction before any strong opinion is justified.`,
    thesis: "Uncertainty-first asset analysis",
    evidenceRefs: [],
  };

  try {
    const result = await generateTextInferenceJson<MotoSubmission>({
      temperature: 0.75,
      maxTokens: 900,
      messages: [
        {
          role: "system",
          content:
            "Return JSON only. You are a MOTO submitter for a general asset scanner. Produce one novel research lane, not a final report. Use evidence references by bracket number when available. No financial advice.",
        },
        {
          role: "user",
          content: JSON.stringify({
            topic: input.topic,
            evidence: input.evidence,
            alreadyAccepted: input.accepted,
            rejectedFeedback: input.rejected,
            outputShape: {
              submission: "detailed research lane, 120-220 words",
              thesis: "short thesis name",
              evidenceRefs: ["[1]", "[2]"],
            },
          }),
        },
      ],
    });
    return z
      .object({
        submission: z.string().min(20),
        thesis: z.string().min(2),
        evidenceRefs: z.array(z.string()).default([]),
      })
      .parse(result);
  } catch {
    return fallback;
  }
}

async function validateMotoSubmission(input: {
  topic: string;
  evidence: string;
  submission: MotoSubmission;
  accepted: string[];
}): Promise<MotoDecision> {
  const fallback: MotoDecision = {
    decision: input.accepted.length < 2 ? "accept" : "reject",
    reasoning: "Fallback validator accepted only enough lanes to keep the analysis moving.",
    steeringFeedback: "Prefer more source-grounded, non-duplicative claims.",
    scores: { novelty: 5, evidenceUse: 4, predictiveUsefulness: 5 },
  };

  try {
    const result = await generateTextInferenceJson<MotoDecision>({
      temperature: 0.2,
      maxTokens: 700,
      messages: [
        {
          role: "system",
          content:
            "Return JSON only. You are a MOTO validator. Accept a submission only if it adds useful, source-aware, predictive value and does not duplicate accepted lanes.",
        },
        {
          role: "user",
          content: JSON.stringify({
            topic: input.topic,
            evidence: input.evidence,
            accepted: input.accepted,
            submission: input.submission,
            outputShape: {
              decision: "accept|reject",
              reasoning: "one sentence",
              steeringFeedback: "one sentence",
              scores: {
                novelty: "1-10",
                evidenceUse: "1-10",
                predictiveUsefulness: "1-10",
              },
            },
          }),
        },
      ],
    });
    return z
      .object({
        decision: z.enum(["accept", "reject"]),
        reasoning: z.string(),
        steeringFeedback: z.string(),
        scores: z.object({
          novelty: z.number(),
          evidenceUse: z.number(),
          predictiveUsefulness: z.number(),
        }),
      })
      .parse(result);
  } catch {
    return fallback;
  }
}

async function runMoto(input: { topic: string; evidence: string }) {
  const accepted: string[] = [];
  const rejected: string[] = [];
  const submissions = await Promise.all(
    Array.from({ length: MOTO_SUBMITTER_COUNT }, (_, index) =>
      generateMotoSubmission({
        topic: input.topic,
        evidence: input.evidence,
        index,
        accepted,
        rejected,
      }),
    ),
  );

  for (const submission of submissions) {
    const decision = await validateMotoSubmission({
      topic: input.topic,
      evidence: input.evidence,
      submission,
      accepted,
    });
    if (decision.decision === "accept") accepted.push(submission.submission);
    else rejected.push(decision.steeringFeedback || decision.reasoning);
  }

  if (!accepted.length && submissions[0]) accepted.push(submissions[0].submission);

  return {
    roundsRun: 1,
    convergenceReason: "single_pass_parallel_asset_scan",
    acceptedSubmissions: accepted,
    rejectedFeedback: rejected,
  };
}

async function evaluateArchetype(input: {
  topic: string;
  evidence: string;
  moto: string[];
  archetype: (typeof ARCHETYPES)[number];
}): Promise<AssetOpinion> {
  const fallback: AssetOpinion = {
    archetypeId: input.archetype.id,
    archetypeName: input.archetype.name,
    stance: "uncertain",
    confidence: 0.35,
    scores: {
      evidenceQuality: 4,
      upside: 5,
      downside: 5,
      socialMomentum: 4,
      falsifiability: 5,
      timeSensitivity: 5,
    },
    verdict: `${input.archetype.name} needs more verified evidence before taking a strong position.`,
    catalyst: "Fresh, source-backed evidence would move the opinion.",
  };

  try {
    const result = await generateTextInferenceJson<AssetOpinion>({
      temperature: 0.45,
      maxTokens: 900,
      messages: [
        {
          role: "system",
          content:
            "Return JSON only. You are a MiroShark-style simulation archetype. Give an opinion from your role, grounded in evidence and MOTO lanes. No financial advice.",
        },
        {
          role: "user",
          content: JSON.stringify({
            topic: input.topic,
            role: input.archetype,
            evidence: input.evidence,
            motoAcceptedLanes: input.moto,
            outputShape: {
              archetypeId: input.archetype.id,
              archetypeName: input.archetype.name,
              stance: "bullish|bearish|neutral|uncertain",
              confidence: "0-1",
              scores: {
                evidenceQuality: "1-10",
                upside: "1-10",
                downside: "1-10",
                socialMomentum: "1-10",
                falsifiability: "1-10",
                timeSensitivity: "1-10",
              },
              verdict: "120-180 words",
              catalyst: "one sentence",
            },
          }),
        },
      ],
    });
    return z
      .object({
        archetypeId: z.string(),
        archetypeName: z.string(),
        stance: z.enum(["bullish", "bearish", "neutral", "uncertain"]),
        confidence: z.number().min(0).max(1),
        scores: z.object({
          evidenceQuality: z.number(),
          upside: z.number(),
          downside: z.number(),
          socialMomentum: z.number(),
          falsifiability: z.number(),
          timeSensitivity: z.number(),
        }),
        verdict: z.string(),
        catalyst: z.string(),
      })
      .parse(result);
  } catch {
    return fallback;
  }
}

function consensus(opinions: AssetOpinion[]) {
  const dims = [
    "evidenceQuality",
    "upside",
    "downside",
    "socialMomentum",
    "falsifiability",
    "timeSensitivity",
  ] as const;
  const output: Record<string, number> = {};
  for (const dim of dims) {
    const values = opinions.map((opinion) => opinion.scores[dim]);
    output[dim] = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  }
  return output;
}

function marketPrice(mean: Record<string, number>) {
  const score =
    mean.evidenceQuality * 0.2 +
    mean.upside * 0.24 +
    (10 - mean.downside) * 0.22 +
    mean.socialMomentum * 0.14 +
    mean.falsifiability * 0.1 +
    mean.timeSensitivity * 0.1;
  return Math.max(0, Math.min(1, score / 10));
}

function buildRisk(mean: Record<string, number>, evidence: AssetEvidenceItem[]) {
  const flags: string[] = [];
  if ((mean.evidenceQuality ?? 0) < 5) flags.push("Thin source quality");
  if ((mean.downside ?? 0) >= 7) flags.push("High downside concentration");
  if ((mean.socialMomentum ?? 0) < 4) flags.push("Weak social momentum");
  if (!evidence.length) flags.push("No live Pay.sh evidence returned");

  const score = Math.min(100, flags.length * 22 + Math.max(0, (mean.downside ?? 5) - 5) * 8);
  const label = !evidence.length
    ? "Unknown"
    : score < 30
      ? "Lower"
      : score < 65
        ? "Medium"
        : "High";
  return { score, label, flags } as AssetAnalysisResult["risk"];
}

async function synthesizeCategories(input: {
  topic: string;
  evidence: string;
  moto: string[];
  opinions: AssetOpinion[];
}): Promise<AssetAnalysisResult["categories"]> {
  const fallback = {
    technical: [input.moto[0] ?? "Technical evidence is limited."],
    market: [input.opinions[0]?.verdict ?? "Market structure needs more evidence."],
    thesis: [input.moto[1] ?? "The thesis should stay conditional until more sources agree."],
    public: [input.opinions.find((opinion) => opinion.archetypeId === "social_listener")?.verdict ?? "Public signal is inconclusive."],
    prediction: [input.opinions.find((opinion) => opinion.archetypeId === "prediction_trader")?.catalyst ?? "Define a time-boxed catalyst before acting."],
  };

  try {
    const result = await generateTextInferenceJson<AssetAnalysisResult["categories"]>({
      temperature: 0.25,
      maxTokens: 900,
      messages: [
        {
          role: "system",
          content:
            "Return JSON only. Synthesize a general asset analysis into technical, market, thesis, public, and prediction arrays. Be detailed but concise. No financial advice.",
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
    });
    return {
      technical: safeStringArray(result.technical, fallback.technical),
      market: safeStringArray(result.market, fallback.market),
      thesis: safeStringArray(result.thesis, fallback.thesis),
      public: safeStringArray(result.public, fallback.public),
      prediction: safeStringArray(result.prediction, fallback.prediction),
    };
  } catch {
    return fallback;
  }
}

export async function analyzeAsset(
  topicInput: string,
  options?: { jobId?: string },
): Promise<AssetAnalysisResult> {
  const topic = normalizeTopic(topicInput);
  const payResearch = await collectPayShEvidence(topic, options?.jobId);
  const digest = evidenceDigest(payResearch.evidence);
  const moto = await runMoto({ topic, evidence: digest });
  const opinions = await Promise.all(
    ARCHETYPES.map((archetype) =>
      evaluateArchetype({
        topic,
        evidence: digest,
        moto: moto.acceptedSubmissions,
        archetype,
      }),
    ),
  );
  const mean = consensus(opinions);
  const price = marketPrice(mean);
  const risk = buildRisk(mean, payResearch.evidence);
  const categories = await synthesizeCategories({
    topic,
    evidence: digest,
    moto: moto.acceptedSubmissions,
    opinions,
  });
  const payOk = payResearch.statuses.some((status) => status === "ok");
  const payStatus = payOk ? "ok" : payResearch.statuses.some((status) => status === "missing_cli") ? "missing_cli" : "disabled";

  return {
    topic,
    normalizedTopic: topic,
    generatedAt: new Date().toISOString(),
    engine: {
      name: "HyperMyths Asset Analysis Engine",
      motoStatus: moto.acceptedSubmissions.length ? "ok" : "error",
      miroSharkStatus: opinions.length ? "ok" : "error",
      payShStatus: payStatus,
      summary:
        `Analyzed ${topic} with Pay.sh research connectors, a MOTO-style parallel research pass, and MiroShark-style archetype opinions.`,
    },
    providerStatus: {
      paySh: payStatus,
      webSearch: payResearch.evidence.some((item) => item.provider.includes("Exa") || item.provider.includes("Perplexity") || item.provider.includes("Serper")) ? "ok" : payStatus,
      socialSearch: payResearch.evidence.some((item) => item.provider.includes("Reddit") || item.provider.includes("TikTok") || item.provider.includes("Instagram")) ? "ok" : payStatus,
      inference: "ok",
      moto: moto.acceptedSubmissions.length ? "ok" : "error",
      miroShark: opinions.length ? "ok" : "error",
    },
    categories,
    risk,
    article: {
      title: `${topic} Asset Scan`,
      summary: [
        categories.market[0] ?? "Market signal is inconclusive.",
        categories.public[0] ?? "Public signal is inconclusive.",
        `MiroShark consensus price: ${price.toFixed(2)}.`,
      ],
      story: [
        `MOTO accepted ${moto.acceptedSubmissions.length} research lane(s): ${moto.acceptedSubmissions.join(" ")}`,
        `The archetype layer produced ${opinions.length} opinions. ${opinions.map((opinion) => `${opinion.archetypeName}: ${opinion.stance}`).join("; ")}.`,
        `Risk read: ${risk.label}${risk.flags.length ? ` (${risk.flags.join(", ")})` : ""}.`,
      ],
    },
    moto,
    miroShark: {
      marketPrice: price,
      consensus: mean,
      headlineCatalysts: opinions.map((opinion) => `[${opinion.archetypeName}] ${opinion.catalyst}`),
      opinions,
    },
    sources: {
      payShEndpoints: payResearch.endpoints,
      evidence: payResearch.evidence,
    },
  };
}
