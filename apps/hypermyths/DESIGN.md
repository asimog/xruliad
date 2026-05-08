---
version: alpha
name: HyperMyths Overlay System
description: Foreground design system for the readable interface layers above the existing visual background and music engine.
colors:
  background-base: "#000000"
  ink: "#E9FFF9"
  text: "#D5F7F1"
  muted: "#B0E0D8"
  accent: "#49C5B6"
  accent-strong: "#73FFE4"
  panel: "#040A0DB3"
  panel-strong: "#050E12D1"
  border-soft: "#73FFE424"
  border-strong: "#73FFE447"
typography:
  h1:
    fontFamily: Space Grotesk
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: -0.03em
  h2:
    fontFamily: Space Grotesk
    fontSize: 1.75rem
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.03em
  body-md:
    fontFamily: Space Grotesk
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.7
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 0.72rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.16em
rounded:
  sm: 12px
  md: 18px
  lg: 28px
spacing:
  xs: 0.4rem
  sm: 0.7rem
  md: 1rem
  lg: 1.4rem
  xl: 2rem
components:
  header-shell:
    backgroundColor: "{colors.panel-strong}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  nav-link:
    textColor: "{colors.text}"
    rounded: 999px
  nav-link-active:
    backgroundColor: "#73FFE41F"
    textColor: "{colors.ink}"
    rounded: 999px
  surface-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
  button-primary:
    backgroundColor: "#49C5B629"
    textColor: "{colors.ink}"
    rounded: 8px
---

## Overview
HyperMyths already has a strong atmospheric foundation through its animated background and music-reactive layer. This design system is intentionally limited to the interface surfaces above that foundation.

The goal is not to repaint the world underneath. The goal is to make every foreground decision easier to read, easier to scan, and calmer to operate.

## Colors
The interface uses a dark-glass surface language with a restrained luminous accent.

- **Background base** stays pure black so the existing visual engine remains the dominant backdrop.
- **Ink** is reserved for headlines, active navigation, and important controls.
- **Text** and **Muted** provide a clearer reading ladder than a single universal teal.
- **Accent** remains the recognizable HyperMyths signal color.
- **Panel** and **Panel strong** create separation without flattening the motion beneath them.

## Typography
Space Grotesk remains the primary face, but it should be applied with stronger hierarchy.

- Headlines should feel compressed, cinematic, and decisive.
- Body copy should open up line-height for readability.
- Labels should be consistently uppercase and high tracking so scanning feels deliberate rather than noisy.

## Layout
Foreground content should feel like an instrument panel.

- Use wider internal padding than before.
- Prefer grouped cards with consistent radii and borders.
- Keep hero copy narrow enough to read quickly.
- On mobile, reveal navigation progressively through a three-line menu rather than showing every option at once.

## Components
Headers, cards, and buttons should share one visual grammar.

- Rounded glass shells for navigation.
- Softer text by default, brighter text on interaction.
- Clear active states that do not rely on color alone.
- Mobile menu items should be tall tap targets with strong separation.

## Do's and Don'ts
- Do preserve the visual background and music-integrated layer exactly as the stage beneath the UI.
- Do improve contrast through text hierarchy, spacing, and surface depth.
- Do keep foreground motion subtle and purposeful.
- Don't flood all copy with the accent color.
- Don't introduce flat white cards or generic app chrome that fights the atmosphere.
