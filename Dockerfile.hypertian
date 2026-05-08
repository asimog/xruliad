FROM node:22-alpine AS builder
WORKDIR /app

COPY apps/hypertian/package.json apps/hypertian/package-lock.json apps/hypertian/
COPY apps/hypertian/scripts/quiet-bigint-buffer.js apps/hypertian/scripts/

WORKDIR /app/apps/hypertian
RUN npm install --legacy-peer-deps

COPY apps/hypertian/ .
COPY packages/fonts/ /app/packages/fonts/
COPY packages/music-orb/ /app/packages/music-orb/
COPY packages/theme/ /app/packages/theme/
COPY packages/ui/ /app/packages/ui/
COPY packages/visuals/ /app/packages/visuals/
COPY packages/product-api/ /app/packages/product-api/

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/apps/hypertian/.next/standalone ./
COPY --from=builder /app/apps/hypertian/.next/static ./apps/hypertian/.next/static
COPY --from=builder /app/apps/hypertian/public ./apps/hypertian/public

EXPOSE 3000
CMD ["node", "server.js"]
