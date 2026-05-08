# Intelligence Engine

`packages/intelligence` and `services/intelligence-worker` provide the shared intelligence boundary.

Use cases:

- Market intelligence: HyperMyths, Polymyths, Hypertian.
- Cancer research intelligence: CancerHawk, with careful public-good language and no clinical claims.
- Physics research intelligence: HyperKaon simulation prompts, synthetic data tasks, benchmark generation, anomaly notes.
- Video model script generation: HyperMyths scripts from token contracts, X profiles, wallets, market theses, research tasks, and simulation outputs.

Shared types live in `packages/types`:

- `IntelligenceReport`
- `MarketSignal`
- `ResearchQuest`
- `SimulationScenario`
- `PredictionThesis`
- `VideoScript`
- `AgentRun`
- `PaidApiCall`
- `SimulationRun`
- `EvidenceSource`
- `ScenarioOutcome`

Flow:

1. App or worker creates a scenario, report, quest, thesis, or script request.
2. Optional paid source calls route through `packages/payments`.
3. Optional swarm simulations route through `packages/simulation`.
4. The intelligence package normalizes outputs into shared report objects.
5. Product apps render product-specific surfaces from the shared objects.
