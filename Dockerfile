# Build stage: compile server + frontend
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
COPY web/package*.json ./web/
RUN npm run install:all
COPY . .
RUN npm run build

# Runtime stage: single container serves API + static frontend
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=build --chown=node:node /app/server/dist ./server/dist
COPY --from=build --chown=node:node /app/server/package*.json ./server/
COPY --from=build --chown=node:node /app/web/dist ./web/dist
COPY --from=build --chown=node:node /app/prompts ./prompts
COPY --from=build --chown=node:node /app/references ./references
COPY --from=build --chown=node:node /app/stories ./stories

RUN npm --prefix server install --omit=dev

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1

CMD ["node", "server/dist/index.js"]
