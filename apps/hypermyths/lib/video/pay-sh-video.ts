import { spendPaySh } from "@/lib/pay/intermediary";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstString(value: unknown, keys: string[]): string | null {
  const record = asRecord(value);
  for (const key of keys) {
    const found = record[key];
    if (typeof found === "string" && found.trim()) return found.trim();
  }
  return null;
}

export async function generatePayShVideo(input: {
  jobId: string;
  prompt: string;
  imageUrl?: string;
  durationSeconds: number;
}): Promise<{ videoUrl: string; thumbnailUrl: string | null }> {
  const result = await spendPaySh({
    jobId: input.jobId,
    endpointId: "pay_sh_video_generate",
    body: {
      prompt: input.prompt,
      imageUrl: input.imageUrl,
      durationSeconds: input.durationSeconds,
      aspectRatio: "16:9",
    },
  });

  if (result.status !== "ok") {
    throw new Error(result.error ?? `Pay.sh video call failed with status ${result.status}.`);
  }

  const record = asRecord(result.data);
  const nested = asRecord(record.data);
  const videoUrl =
    firstString(record, ["videoUrl", "video_url", "url", "output"]) ??
    firstString(nested, ["videoUrl", "video_url", "url", "output"]);
  if (!videoUrl) {
    throw new Error("Pay.sh video endpoint did not return a video URL.");
  }

  return {
    videoUrl,
    thumbnailUrl:
      firstString(record, ["thumbnailUrl", "thumbnail_url", "thumbnail"]) ??
      firstString(nested, ["thumbnailUrl", "thumbnail_url", "thumbnail"]),
  };
}
