import JobPageClient, { type JobApiResponse } from "@/components/job/JobPageClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function JobPage({ params }: PageProps) {
  const { jobId } = await params;
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  let initialData: JobApiResponse | null = null;
  let initialError: string | null = null;

  try {
    const response = await fetch(`${appBaseUrl}/api/jobs/${jobId}`, {
      cache: "no-store",
    });

    const payload = (await response.json()) as
      | JobApiResponse
      | { error?: string; message?: string };

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return (
          <JobPageClient
            jobId={jobId}
            initialData={null}
            initialError={null}
          />
        );
      }

      const failure = payload as { error?: string; message?: string };
      initialError = failure.error ?? failure.message ?? "Failed to load trailer.";

      // Fallback path: if job API is unavailable, try lightweight video status.
      try {
        const videoResponse = await fetch(`${appBaseUrl}/api/video/${jobId}`, {
          cache: "no-store",
        });
        const videoPayload = (await videoResponse.json()) as {
          status?: string;
          error?: string;
        };
        if (
          videoResponse.ok ||
          videoResponse.status === 409 ||
          videoResponse.status === 500
        ) {
          const nowIso = new Date().toISOString();
          const status =
            videoPayload.status === "ready"
              ? "complete"
              : videoPayload.status === "failed"
                ? "failed"
                : "processing";
          const progress =
            videoPayload.status === "ready"
              ? "complete"
              : videoPayload.status === "failed"
                ? "failed"
                : "generating_video";

          initialData = {
            job: {
              jobId,
              status,
              progress,
              requestKind: null,
              subjectName: null,
              subjectSymbol: null,
              subjectDescription: null,
              updatedAt: nowIso,
              createdAt: nowIso,
              errorMessage: videoPayload.error ?? null,
            },
            report: null,
            video: {
              renderStatus: videoPayload.status ?? "queued",
              videoUrl: null,
              thumbnailUrl: null,
            },
            status,
            progress,
          };
          initialError = null;
        }
      } catch {
        // keep initialError from primary fetch
      }
    } else {
      initialData = payload as JobApiResponse;
    }
  } catch (error) {
    initialError =
      error instanceof Error ? error.message : "Failed to load trailer.";
  }

  return (
    <JobPageClient
      jobId={jobId}
      initialData={initialData}
      initialError={initialError}
    />
  );
}
