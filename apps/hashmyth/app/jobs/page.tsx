import { AppShell, Badge, Card, SectionFrame } from "@hypermyths/ui";
import { type HashMythVideoJobStatus, type HashMythVideoSource } from "@hypermyths/hashmyth-video";

const demoJobs = [
  { id: "job-001", source: "token" as HashMythVideoSource, status: "complete" as HashMythVideoJobStatus },
  { id: "job-002", source: "wallet" as HashMythVideoSource, status: "running" as HashMythVideoJobStatus },
  { id: "job-003", source: "market_thesis" as HashMythVideoSource, status: "queued" as HashMythVideoJobStatus },
  { id: "job-004", source: "x_profile" as HashMythVideoSource, status: "complete" as HashMythVideoJobStatus },
  { id: "job-005", source: "ad_campaign" as HashMythVideoSource, status: "failed" as HashMythVideoJobStatus },
];

const statusColors: Record<HashMythVideoJobStatus, string> = {
  prepared: "#a78bfa",
  quoted: "#93c5fd",
  requires_payment: "#f5c542",
  queued: "#93c5fd",
  running: "#49c5b6",
  complete: "#5eead4",
  failed: "#ef4444",
  cancelled: "#6b7280"
};

export default function JobsPage() {
  return (
    <AppShell productId="hashmyth" showNav>
      <SectionFrame style={{ paddingTop: "96px" }}>
        <h1>Video Jobs</h1>
        <p style={{ color: "rgba(233,239,255,0.7)", marginBottom: "2rem" }}>
          Track and manage your video generation jobs.
        </p>
        <div className="hashmyth-grid">
          {demoJobs.map((job) => (
            <Card key={job.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <code style={{ fontSize: "0.75rem", color: "rgba(233,239,255,0.5)" }}>{job.id}</code>
                <Badge style={{ background: statusColors[job.status] }}>{job.status}</Badge>
              </div>
              <h3 style={{ margin: "0 0 0.25rem", color: "#fff" }}>Source: {job.source}</h3>
              <p style={{ margin: 0, color: "rgba(233,239,255,0.5)", fontSize: "0.8rem" }}>
                Track at GET /api/video/jobs/{job.id}
              </p>
            </Card>
          ))}
        </div>
      </SectionFrame>
    </AppShell>
  );
}
