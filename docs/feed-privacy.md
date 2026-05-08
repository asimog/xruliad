# Feed Privacy

## Overview

The Unified Feed employs privacy-preserving techniques for local/private jobs while maintaining full transparency for web/platform jobs.

## Visibility Modes

| Mode | Web feed | Cloud storage | Decryptable by |
|---|---|---|---|
| `public` | Full visible | Full record | Anyone |
| `encrypted_public` | Encrypted envelope | Encrypted record | Owner only |
| `encrypted_unlisted` | Encrypted envelope, unlisted | Encrypted record | Owner only |
| `redacted_public` | Safe summary only | Redacted record | Owner (full) / Anyone (redacted) |
| `redacted_private` | Safe summary only | Redacted record | Owner only |
| `commitment_only` | Hash + status | Commitment hash | Owner (full decrypt) |
| `local_private` | Not synced | Not stored | Local only |

## Privacy Modes

| Mode | Creator | Content | Used for |
|---|---|---|---|
| `transparent` | Real identity | Full content | Web jobs, platform payments |
| `pseudonymous` | Pseudonym only | Full content | Local jobs, opted-in |
| `encrypted_actor` | Encrypted blob | Redacted | Local jobs (default) |
| `encrypted_content` | Encrypted actor | Encrypted content | Private strategies |
| `redacted_content` | Pseudonym | Safe summary | QVAC jobs |
| `commitment_only` | Commitment hash | Commitment hash | Trading intents |
| `local_only` | N/A | N/A | Not published |

## Safe Summaries

Generated for private jobs:
- "Local trade intent prepared" (trading)
- "Private strategy sealed" (encrypt)
- "Local QVAC reasoning completed" (QVAC)
- "Local execution intent prepared" (execution)

## Blocked Content

Never appears in feed:
- Wallet addresses
- Private keys
- Seed phrases
- API secrets
- Raw strategy content
- QVAC reasoning transcripts
- Exchange API credentials

## Threat Model

- Cloud attacker: sees only encrypted/redacted/commitment envelopes
- Web users: see transparent metadata for web jobs
- Owner: can decrypt their own encrypted envelopes
