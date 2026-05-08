# GitHub Safety Rules

## Hard Constraints

### Never
- Never push source-code changes directly to `main`.
- Never allow the agent to edit `.env*`, `secrets/**`, `private/**`, `keys/**`.
- Never allow the agent to edit `.github/workflows/**` without explicit workflow permission.
- Never commit large videos (>10MB default) to GitHub — use Supabase Storage.
- Never let the agent merge its own PRs without human approval.
- Never fake GitHub App success — return `requires_credentials` status honestly.

### Always
- Always use branches for code edits (prefix: `agent/`).
- Always open PRs for code changes.
- Always enforce path allowlist before any file operation.
- Always log GitHub tasks to `github_tasks` table.
- Always prefer GitHub App auth over personal access tokens.
- Always show path policy violations clearly.

## Artifact Size

Maximum artifact size for GitHub: 10MB (configurable via `ARTIFACT_MAX_GITHUB_SIZE_MB`).

Large assets (videos, datasets, models) should use:
- Supabase Storage for private/cloud artifacts
- External storage/CDN for public large files
- GitHub only for text/code artifacts

## PR Workflow

```
agent creates branch → agent commits → agent opens PR → human reviews → human merges
```

## Publish Workflow

```
agent generates artifact → agent writes to allowed path → commit to artifact branch → metadata stored in github_artifacts
```
