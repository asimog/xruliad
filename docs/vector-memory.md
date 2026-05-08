# Vector Memory (RAG)

## Purpose

Semantic search over agent memory, theses, and documents using vector embeddings.

## Architecture

```
Text → chunkText() → MemoryChunks
                    → chooseEmbeddingProvider() → QVAC (private) / OpenRouter (public)
                    → store in memory_chunks with pgvector embedding column
                    → searchMemory() / searchTheses() / searchDocuments()
```

## Components

### `@hypermyths/vector-memory`

- `chunkText()` — split text into 1500-char chunks.
- `chooseEmbeddingProvider()` — select QVAC or cloud provider based on privacy tier.
- `searchTheses()` — vector search over thesis chunks.
- `searchMemory()` — vector search over agent memory chunks.
- `searchDocuments()` — vector search over document chunks.
- `vectorMemoryStatus()` — check embedding availability.

## Embedding Provider Rules

| Privacy Tier | QVAC Available | QVAC Unavailable |
|---|---|---|
| public / internal | cloud (OpenRouter) | cloud |
| sensitive | cloud (with approval) | cloud (with approval) |
| private_strategy | QVAC | none (blocked) |
| wallet_or_key_material | none (blocked) | none (blocked) |
| medical_research_sensitive | QVAC | none (blocked) |

## pgvector Setup

Migration `0001_core_identity.sql` includes:
```sql
create extension if not exists vector;
```

Migration `0002_agent_memory.sql` adds the embedding column conditionally:
```sql
alter table memory_chunks add column if not exists embedding vector(1536);
```

If pgvector is unavailable, chunks are stored without embeddings and `embedding_status` is `unavailable`.

## TypeScript Types

```typescript
type MemoryChunk = {
  id: string;
  memoryId: string;
  index: number;
  text: string;
  embedding?: number[];       // 1536-dim float array
  embeddingModel?: string;
  embeddingStatus: "available" | "unavailable" | "blocked";
  createdAt: string;
};

type VectorSearchResult = {
  chunkId: string;
  memoryId: string;
  text: string;
  score: number;
};
```
