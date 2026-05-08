import { z } from "zod";

import { X_PROFILE_TWEET_LIMIT } from "@/lib/x/constants";

export const videoInputTypeSchema = z.enum([
  "prompt",
  "x_profile",
  "contract_address",
  "wallet_address",
  "image_url",
]);

export const publicVideoInputTypeSchema = z.enum([
  "x_profile",
  "contract_address",
  "wallet_address",
]);

export const videoPipelineSchema = z.enum([
  "two_act_cinema",
  "hypermyths_generic_engine",
]);

export const videoChainSchema = z.enum([
  "auto",
  "solana",
  "ethereum",
  "bsc",
  "base",
]);

export type VideoInputType = z.infer<typeof videoInputTypeSchema>;
export type PublicVideoInputType = z.infer<typeof publicVideoInputTypeSchema>;
export type VideoPipelineMode = z.infer<typeof videoPipelineSchema>;
export type VideoChain = z.infer<typeof videoChainSchema>;

export function resolveExperienceFromPipeline(
  pipeline: VideoPipelineMode,
): "mythx" | "two_act_cinema" {
  return pipeline === "hypermyths_generic_engine" ? "mythx" : "two_act_cinema";
}

export function buildPromptDirection(input: {
  value: string;
  notes?: string;
  pipeline: VideoPipelineMode;
}): string {
  const modeLine =
    input.pipeline === "hypermyths_generic_engine"
      ? "Format: HyperMythsGenericEngine. Build a modular stitched cinematic short with 3 to 10 acts, based on the server's configured act count."
      : "Format: 2-Act Cinema. Build a fixed two-part cinematic short with an opening setup and final reveal.";

  return [
    modeLine,
    `Core concept: ${input.value.trim()}`,
    input.notes?.trim() ? `Creative direction: ${input.notes.trim()}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function buildProfileDirection(input: {
  username: string;
  notes?: string;
  pipeline: VideoPipelineMode;
}): string {
  const modeLine =
    input.pipeline === "hypermyths_generic_engine"
      ? "Format: HyperMythsGenericEngine. Build a stitched internet biography assembled from 3 to 10 cinematic scenes."
      : "Format: 2-Act Cinema. Build a two-part internet biography with a setup and final mythic reveal.";

  return [
    modeLine,
    `Subject: @${input.username}`,
    `Evidence scope: hydrate up to ${X_PROFILE_TWEET_LIMIT} recent tweets before final rendering.`,
    "Direction: build a sharp internet-native biography from voice, contradictions, obsessions, and public persona rather than a literal tweet recap.",
    input.notes?.trim() ? `Creative direction: ${input.notes.trim()}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function buildContractDirection(input: {
  tokenName: string | null;
  tokenSymbol: string | null;
  chain: string;
  description: string | null;
  notes?: string;
  pipeline: VideoPipelineMode;
}): string {
  const modeLine =
    input.pipeline === "hypermyths_generic_engine"
      ? "Format: HyperMythsGenericEngine. Build a stitched token film assembled from 3 to 10 cinematic scenes."
      : "Format: 2-Act Cinema. Build a fixed two-part token film with setup and final reveal.";

  return [
    modeLine,
    input.tokenName || input.tokenSymbol
      ? `Subject: ${input.tokenName ?? "Unknown token"}${input.tokenSymbol ? ` (${input.tokenSymbol})` : ""} on ${input.chain}.`
      : null,
    input.description ? `Metadata: ${input.description}` : null,
    input.notes?.trim() ? `Creative direction: ${input.notes.trim()}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function buildWalletDirection(input: {
  wallet: string;
  notes?: string;
}): string {
  return [
    "Format: 2-Act Cinema. Build a fixed two-part wallet trailer with a setup and final reveal.",
    `Subject: Solana wallet ${input.wallet}.`,
    "Evidence scope: analyze the last 24 hours of wallet activity only.",
    "Data sources: use Helius wallet history for transactions and DexScreener for token metadata/context.",
    "Direction: make the trailer feel like a cinematic trading recap rather than a dry analytics dashboard.",
    input.notes?.trim() ? `Creative direction: ${input.notes.trim()}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function buildImageDirection(input: {
  imageUrl: string;
  notes?: string;
}): string {
  return [
    "Format: 2-Act Cinema. Build a fixed two-part cinematic trailer anchored to the supplied image.",
    `Primary visual reference: ${input.imageUrl}.`,
    "Direction: preserve the subject, mood, silhouette, and visual identity of the source image while adding motion and cinematic escalation.",
    input.notes?.trim()
      ? `Creative direction: ${input.notes.trim()}`
      : "Creative direction: turn the image into a bold launch-ready trailer.",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}
