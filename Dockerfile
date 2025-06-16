# Stage 1: Build the frontend
FROM node:18 AS frontend-builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend /app/apps/frontend
RUN pnpm install --frozen-lockfile
RUN pnpm --filter frontend build

# Stage 2: Build the backend
FROM node:18 AS backend-builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend /app/apps/backend
RUN pnpm install --frozen-lockfile
RUN pnpm --filter backend build

# Stage 3: Production image
FROM node:18-alpine
WORKDIR /app
COPY --from=frontend-builder /app/apps/frontend/dist /app/apps/frontend/dist
COPY --from=backend-builder /app/apps/backend/dist /app/apps/backend/dist
COPY --from=backend-builder /app/apps/backend/node_modules /app/apps/backend/node_modules
COPY apps/backend/package.json /app/apps/backend/package.json

# Copy root package.json to ensure correct workspace paths if needed by backend
COPY package.json ./

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD curl --fail http://localhost:3001/ping || exit 1

CMD ["node", "apps/backend/dist/index.js"]
