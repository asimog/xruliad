FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
WORKDIR /app

COPY . .

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @hypermyths/hashmyth build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/apps/hashmyth/.next/standalone ./
COPY --from=builder /app/apps/hashmyth/.next/static ./apps/hashmyth/.next/static
COPY --from=builder /app/apps/hashmyth/public ./apps/hashmyth/public

EXPOSE 3000
CMD ["node", "server.js"]
