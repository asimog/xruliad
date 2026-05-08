export type AutoInputType = "mythx" | "hashmyth" | "random" | "prompt";

export function detectAutoInputType(input: string): AutoInputType {
  const trimmed = input.trim();
  if (!trimmed) return "random";

  if (
    trimmed.startsWith("@") ||
    /^https?:\/\/(www\.)?(x|twitter)\.com\//i.test(trimmed)
  ) {
    return "mythx";
  }

  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
    return "hashmyth";
  }

  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return "hashmyth";
  }

  if (/^[a-zA-Z][a-zA-Z0-9_]{1,14}$/.test(trimmed)) {
    return "mythx";
  }

  return "prompt";
}
