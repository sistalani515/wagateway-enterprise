# Multi-stage Dockerfile untuk Clean Architecture WABot
# Kompatibel untuk Docker lokal dan Hugging Face Spaces (UID 1000, Port 7860)

# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npm run build

# Stage 2: Production
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=7860
ENV SESSION_DIR=/app/sessions

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

# node:20-slim sudah memiliki user 'node' dengan UID 1000
RUN mkdir -p /app/sessions && \
    chown -R node:node /app

USER node

# Expose port untuk Local Docker (7860) dan Render.com (10000 / $PORT)
EXPOSE 7860 10000

CMD ["node", "dist/index.js"]
