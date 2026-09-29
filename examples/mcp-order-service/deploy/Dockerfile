# Phase F (F-5) deployment template for the Koatty app that mounts the
# mcp-order-service module (see ../README.md). It builds YOUR application, which
# imports this reference module and calls `app.use(mcp.middleware)`.
#
# No secrets are baked in: everything comes from the environment.
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install
COPY . .
RUN pnpm build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod
COPY --from=builder /app/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# SSE (/ask) and MCP responses need a streaming-friendly entrypoint; make sure
# your app does not buffer responses and honours the client's disconnect.
CMD ["node", "dist/main.js"]
