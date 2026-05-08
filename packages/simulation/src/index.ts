import type { IntelligenceReport, ProductId, ScenarioOutcome, SimulationScenario } from "@hypermyths/types";

export type MiroSharkConfig = {
  baseUrl?: string;
  apiKey?: string;
  dockerEnabled: boolean;
  defaultModel?: string;
  maxAgents: number;
  maxSimulationHours: number;
};

export function readMiroSharkConfig(): MiroSharkConfig {
  return {
    baseUrl: process.env.MIROSHARK_BASE_URL,
    apiKey: process.env.MIROSHARK_API_KEY,
    dockerEnabled: process.env.MIROSHARK_DOCKER_ENABLED === "true",
    defaultModel: process.env.MIROSHARK_DEFAULT_MODEL,
    maxAgents: Number(process.env.MIROSHARK_MAX_AGENTS ?? 250),
    maxSimulationHours: Number(process.env.MIROSHARK_MAX_SIMULATION_HOURS ?? 24)
  };
}

export class MiroSharkClient {
  constructor(private readonly config: MiroSharkConfig = readMiroSharkConfig()) {}

  assertReady() {
    if (!this.config.baseUrl) throw new Error("MIROSHARK_BASE_URL is required to call MiroShark.");
    if (!this.config.apiKey) throw new Error("MIROSHARK_API_KEY is required unless the local service explicitly disables auth.");
  }

  async runSimulation(scenario: SimulationScenario) {
    this.assertReady();
    const response = await fetch(`${this.config.baseUrl!.replace(/\/$/, "")}/api/simulation`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        title: scenario.title,
        seed: scenario.seed,
        agents: Math.min(scenario.populationSize, this.config.maxAgents),
        hours: Math.min(scenario.timelineHours, this.config.maxSimulationHours),
        model: this.config.defaultModel
      })
    });
    if (!response.ok) throw new Error(`MiroShark request failed: HTTP ${response.status}`);
    return response.json() as Promise<unknown>;
  }
}

export function createScenario(input: {
  productId: ProductId;
  title: string;
  seed: string;
  populationSize?: number;
  timelineHours?: number;
}): SimulationScenario {
  return {
    id: crypto.randomUUID(),
    productId: input.productId,
    title: input.title,
    seed: input.seed,
    populationSize: input.populationSize ?? 80,
    timelineHours: input.timelineHours ?? 8,
    inputs: []
  };
}

export function parseSimulationRun(raw: unknown, scenario: SimulationScenario): ScenarioOutcome {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return {
    id: crypto.randomUUID(),
    scenarioId: scenario.id,
    summary: String(value.summary ?? value.report ?? "MiroShark run completed without a summary field."),
    risks: Array.isArray(value.risks) ? value.risks.map(String) : [],
    opportunities: Array.isArray(value.opportunities) ? value.opportunities.map(String) : []
  };
}

export function toIntelligenceReport(productId: ProductId, outcome: ScenarioOutcome): IntelligenceReport {
  return {
    id: crypto.randomUUID(),
    productId,
    title: "Simulation Intelligence Report",
    summary: outcome.summary,
    reportType: "scenario",
    signals: [],
    scenarios: [outcome],
    evidence: [],
    createdAt: new Date().toISOString()
  };
}

export const runSimulation = (scenario: SimulationScenario) => new MiroSharkClient().runSimulation(scenario);
