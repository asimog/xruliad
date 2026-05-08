# Artifact Ledger

## Purpose

The artifact ledger tracks all generated outputs across the HyperMyths ecosystem:

- Research blocks (CancerHawk)
- Video scripts and manifests (HashMyth)
- Simulation reports (HyperKaon)
- Intelligence reports (Polymyths)
- Ad campaigns (Hypertian)
- Code outputs (agent tasks)
- Documentation (docs/generated/)

## Artifact Lifecycle

```
draft → published → (optional: pr_opened → merged)
      ↘ blocked (path policy violation)
      ↘ failed (publish error)
```

## Components

### `@hypermyths/artifact-ledger`

- `createArtifactRecord()` — create artifact with provenance
- `createPublishableArtifact()` — publish to GitHub artifact path
- `createArtifactCodePR()` — create a PR for code artifacts
- `artifactPublishStatus()` — check publish configuration

### ArtifactRecord

```typescript
{
  id: string;
  kind: ArtifactKind;       // research_block, video_script, simulation_report, etc.
  title: string;
  content: string;
  sourceCommandId?: string;
  sourceThesisId?: string;
  sourceJobId?: string;
  sourceAgentId?: string;
  storageUrl?: string;      // Supabase Storage URL
  githubTaskId?: string;    // GitHub task tracking
  githubPath?: string;      // GitHub repository path
  githubSha?: string;       // Commit SHA
  publishStatus: ArtifactPublishStatus;
  visibility: "public" | "private" | "unlisted";
  createdAt: string;
  updatedAt: string;
}
```

## Publishing Flow

1. Command/thesis/research job completes.
2. Generated artifact written to Supabase Storage (large) or in-memory (text).
3. ArtifactRecord created with provenance.
4. GitHub publisher writes to allowed path.
5. Commit SHA stored.
6. Artifact metadata linked to command/thesis/job.
7. Terminal displays artifact receipt.

## Storage

- Text artifacts → GitHub (published) + Supabase (metadata).
- Large binaries → Supabase Storage (private or public bucket).
- Display artifacts → `display_artifacts` table.
- Provenance → `artifact_provenance` table links back to source.
