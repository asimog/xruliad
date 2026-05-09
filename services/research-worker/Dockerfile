FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
WORKDIR /app
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @hypermyths/research-worker build
ENV NODE_ENV=production
ENV DEPLOYMENT_TARGET=railway
ENV APP_RUNTIME_MODE=web
EXPOSE 4200
CMD ["pnpm", "--filter", "@hypermyths/research-worker", "start"]
