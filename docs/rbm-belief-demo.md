# RBM Belief Demo

## Prompt

"Create a market thesis, gather evidence, use the cheapest safe inference route, quote any paid API through pay.sh, update confidence over time, generate a video script, create an ad concept, and prepare a local-only trade intent without executing."

## What the demo shows

1. **Belief creation** — market thesis with initial confidence 35%
2. **Evidence loop** — supporting evidence (order book) → confidence +12% → counter evidence (volume) → confidence -8%
3. **Inference routing** — cheapest safe route selected (OpenRouter free or fallback)
4. **Payment quote** — platform pay.sh quote with transparent pricing
5. **Confidence timeline** — visual progression: 35% → 47% → 39% → 42% → 42%
6. **Artifact generation** — HashMyth video script, Hypertian ad concept, local trade intent
7. **Belief score** — final confidence, risk score, trend, evidence counts

## Route

`/demo/rbm-belief`

## RBM Inspiration Note

This is NOT a machine learning model. It is a practical belief/progress engine inspired by the idea of visible learning iterations. Each step (evidence, inference, payment) shifts confidence using simple transparent scoring.

## Visual Components

- `BeliefTimeline` — step-by-step confidence progression
- `ConfidenceShift` — before/after with explanation
- `BeliefProgressBar` — confidence + risk visualization
- `RouteCostPanel` — inference provider, model, cost
- `EvidenceMatrix` — supporting/counter evidence grid
