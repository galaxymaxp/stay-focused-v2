FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/ packages/
RUN npm ci --workspace=@stay-focused/api --include-workspace-root=false --no-audit --no-fund
COPY apps/api/ apps/api/
ENV NODE_ENV=production
WORKDIR /app/apps/api
USER node
EXPOSE 8080
CMD ["node", "../../node_modules/tsx/dist/cli.mjs", "scripts/google-cloud-worker.ts"]
