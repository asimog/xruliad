# Memory Sync (Local ↔ Cloud)

## Purpose

Synchronize memory between local MythVault and cloud Supabase with privacy controls.

## Sync Policy

| Condition | Auto Sync | Requires Approval | Encrypted |
|---|---|---|---|
| public visibility | Yes | No | No |
| internal visibility | Yes | No | No |
| private visibility | No | Yes | Optional |
| sensitive privacy | No | Yes | Optional |
| private_strategy | No | Yes | Required |
| local_only | Blocked | N/A | N/A |
| wallet_or_key_material | Blocked | N/A | N/A |

## Components

### `@hypermyths/memory-sync`

- `readSyncPolicy()` — read configured sync policy.
- `createSyncItem()` — create a sync queue item with route/mode decisions.
- `blockForbiddenMemorySync()` — check if sync is forbidden.
- `memorySyncStatus()` — check sync configuration.

### SyncQueueItem

```typescript
{
  id: string;
  memoryId: string;
  target: "local_to_cloud" | "cloud_to_local";
  visibility: MemoryVisibility;
  privacyTier: PrivacyTier;
  content: string;
  requiresApproval: boolean;
  requiresEncryption: boolean;
  approved: boolean;
  encrypted: boolean;
  status: "queued" | "approved" | "synced" | "failed" | "blocked";
  reason: string;
  createdAt: string;
}
```

## Flow

```
local memory → blockForbiddenMemorySync() → blocked? (stop)
             → shouldSyncToCloud()         → not allowed? (stop)
             → requireSyncApproval()       → queued (wait for user)
             → createSyncItem()            → synced
```

## Forbidden Sync

Never sync:
- `wallet_or_key_material` tier content
- `local_only` visibility records
- Raw private strategies from web mode
- Unapproved sensitive medical data
