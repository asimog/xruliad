# GitHub Agent Integration

## Setup

1. Create a GitHub App in your org / repo settings.
2. Give it **Contents: Read & Write** and **Pull Requests: Read & Write** permissions.
3. Install the app on the target repo.
4. Generate a private key and download it.
5. Set env vars:

```
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
GITHUB_APP_INSTALLATION_ID=9876543
GITHUB_DEFAULT_OWNER=your-org
GITHUB_DEFAULT_REPO=your-repo
GITHUB_WEBHOOK_SECRET=whsec_...
GITHUB_ALLOWED_REPOS=your-org/your-repo
GITHUB_ARTIFACT_BRANCH=main
GITHUB_CODE_BRANCH_PREFIX=agent/
GITHUB_ALLOW_DIRECT_ARTIFACT_PUBLISH=true
GITHUB_ALLOW_CODE_DIRECT_PUSH=false
GITHUB_ALLOWED_ARTIFACT_PATHS=results/**,public/generated/**,generated/**,reports/**,blocks/**,artifacts/**,docs/generated/**
GITHUB_PROTECTED_PATHS=.env*,secrets/**,private/**,keys/**,.github/workflows/**
```

## Modes

### Artifact Publish
Generated outputs commit directly to `results/`, `generated/`, etc. on the configured branch.

### Code Edit
Source changes create a branch (`agent/xxxxx`), commit, and open a PR. Human approval required.

## Status Check

```bash
pnpm github:check
```
