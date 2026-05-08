# Worker container at repo root for Railway direct uploads.
FROM node:22-alpine AS deps
RUN apk upgrade --no-cache
WORKDIR /app
COPY package.json package-lock.json ./
COPY .npmrc ./.npmrc
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm install --include=dev --no-audit --no-fund

FROM node:22-alpine AS runner
RUN apk upgrade --no-cache && apk add --no-cache bash curl ffmpeg
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

COPY tsconfig.json ./
COPY workers ./workers
COPY lib ./lib
COPY prompts ./prompts
COPY prisma ./prisma
COPY scripts ./scripts
COPY prisma.config.ts ./

EXPOSE ${PORT}

CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx workers/server.ts"]
