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
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/package*.json ./server/
COPY --from=build /app/web/dist ./web/dist
COPY --from=build /app/prompts ./prompts
COPY --from=build /app/stories ./stories
RUN npm --prefix server install --omit=dev
VOLUME ["/app/stories/output"]
EXPOSE 3001
CMD ["node", "server/dist/index.js"]
