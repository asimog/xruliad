# GitHub Agent Integration

## Purpose

The GitHub agent enables the HyperMyths system to:
1. Publish generated artifacts (research blocks, video scripts, intelligence reports) to GitHub.
2. Create pull requests for source code changes (requires human approval).
3. Track all GitHub operations through a typed task ledger.

## Two Modes

### 1. Artifact Publish Mode

For generated outputs that don't touch source code:
- CancerHawk research blocks → `results/block-N/`
- HashMyth video scripts → `generated/videos/`
- HyperKaon simulation reports → `generated/simulations/`
- Polymyths intelligence reports → `generated/theses/`
- Hypertian campaign artifacts → `generated/campaigns/`
- Documentation → `docs/generated/`

This mode may commit directly to the configured artifact branch.

### 2. Code Edit Mode

For source code changes:
1. Create a branch with `agent/` prefix.
2. Edit files.
3. Commit changes.
4. Open a pull request.
5. Wait for human approval and merge.

Code edit mode must NOT push directly to `main`.

## Path Allowlist

### Allowed Artifact Paths (configurable)
```
results/**, public/generated/**, generated/**, reports/**, blocks/**, artifacts/**, docs/generated/**
```

### Protected Paths
```
.env*, secrets/**, private/**, keys/**, .github/workflows/**
```

## Setup

### GitHub App (Recommended)

1. Create a GitHub App in your org/repo settings.
2. Configure permissions: Contents (read/write), Pull Requests (read/write).
3. Install the app on your repo.
4. Set env vars:

```
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
GITHUB_APP_INSTALLATION_ID=9876543
GITHUB_DEFAULT_OWNER=floomhq
GITHUB_DEFAULT_REPO=hypermyths-monorepo
GITHUB_WEBHOOK_SECRET=whsec_...
GITHUB_ALLOWED_REPOS=floomhq/hypermyths-monorepo
GITHUB_ARTIFACT_BRANCH=main
GITHUB_CODE_BRANCH_PREFIX=agent/
GITHUB_ALLOW_DIRECT_ARTIFACT_PUBLISH=true
GITHUB_ALLOW_CODE_DIRECT_PUSH=false
```

### Token Fallback (Optional)

```
GITHUB_TOKEN=ghp_...
```

GitHub App is preferred. Use fallback token only if explicitly configured.

## Package

`@hypermyths/github-agent` provides:
- `readGitHubStatus()` — check configuration and auth state
- `readGitHubPathPolicy()` — read path allowlist from env
- `enforcePathPolicy()` — validate a path against policies
- `createGitHubTask()` — create a typed GitHub task
- `createPublishArtifact()` — create artifact publish task
- `createCodeEditPR()` — create PR task

`@hypermyths/artifact-ledger` provides:
- `createArtifactRecord()` — create artifact metadata
- `createPublishableArtifact()` — create artifact + GitHub publish task
- `createArtifactCodePR()` — create artifact + GitHub PR task
