# OpenRouter BYOK (Bring Your Own Key)

## Overview

Users can run the HyperMyths system with their own OpenRouter API key. The key is handled with privacy first: never logged, never stored in plaintext, never written to Supabase without explicit encrypted-cloud opt-in.

## Storage Modes

### 1. Browser Local (Default)
- Key encrypted in browser `localStorage`
- Safest default
- Key never leaves browser

### 2. Ephemeral Server
- Key sent to Hermes worker for one request only
- Not stored after request completes
- Medium risk

### 3. Encrypted Cloud
- User explicitly opts in
- Key encrypted before Supabase storage
- User controls encryption key
- High risk — documented clearly

## Setup

1. Go to `/setup`
2. Enter OpenRouter API key (starts with `sk-or-`)
3. Test key format (live validation requires API call)
4. Choose storage mode
5. Configure spend policy

## Safety Rules

- Never log the key
- Never send key to Unified Feed
- Never store key in plaintext
- Redact key for all displays: `sk-or-...a1b2`
- Browser-local storage is encrypted
- Key presence is detected but key value is never printed

## Env Vars

```
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_ALLOW_FREE=true
OPENROUTER_ALLOW_PAID=true
OPENROUTER_DEFAULT_MODEL=
OPENROUTER_FREE_MODEL=openrouter/free
OPENROUTER_MAX_REQUEST_COST=
OPENROUTER_DAILY_SPEND_LIMIT=
NEXT_PUBLIC_ENABLE_OPENROUTER_BYOK=true
BYOK_OPENROUTER_STORAGE_MODE=browser_local
BYOK_ALLOW_EPHEMERAL_SERVER_USE=true
BYOK_ALLOW_ENCRYPTED_CLOUD_STORAGE=false
```
