# Visual System

All apps share:

- `packages/theme`: product tokens, domains, nav links, CTA labels, accent colors, background variants.
- `packages/fonts`: display/body/mono CSS variable contract.
- `packages/visuals`: `EcosystemBackground`, grid, orbital gradient, particle/noise layers, product variants.
- `packages/music-orb`: shared opt-in MusicOrb with visual-only default and Web Audio support when an audio source is provided.
- `packages/ui`: shells, cards, panels, CTAs, badges, and product-aware primitives.

Accessibility rules:

- Audio is opt-in and must not autoplay.
- Music controls are keyboard reachable and labelled.
- Motion respects `prefers-reduced-motion`.
- Backgrounds are dark by default and should not flash.
- CancerHawk pages must avoid clinical, treatment, diagnosis, or efficacy claims.

Apps should look related, not cloned. Differences come from product copy, accent color, content, and feature focus.
