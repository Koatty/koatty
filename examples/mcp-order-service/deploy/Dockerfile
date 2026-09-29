# Build from the monorepo root, with recursive submodules checked out:
# docker build -f packages/koatty/examples/mcp-order-service/deploy/Dockerfile .
FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build:base && pnpm --filter @koatty/example-mcp-order-service... build
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "packages/koatty/examples/mcp-order-service/dist/main.js"]
