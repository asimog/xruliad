FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json turbo.json ./

COPY apps/polymyths/package.json apps/polymyths/
COPY packages/ packages/

RUN pnpm install --frozen-lockfile --filter @hypermyths/polymyths

COPY apps/polymyths/ apps/polymyths/
COPY packages/ packages/

RUN pnpm --filter @hypermyths/polymyths build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/apps/polymyths/.next/standalone ./
COPY --from=builder /app/apps/polymyths/.next/static ./apps/polymyths/.next/static
COPY --from=builder /app/apps/polymyths/public ./apps/polymyths/public

EXPOSE 3000
CMD ["node", "server.js"]
