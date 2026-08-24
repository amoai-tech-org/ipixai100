# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Enable corepack for pnpm support
RUN corepack enable

# Copy package files
COPY package.json package-lock.json ./

# Install the locked tree (package.json pins @mastra/memory@1.18.0 exactly)
RUN npm ci

# Copy source code
COPY . .

# Build the Next.js application
RUN npm run build

# Production stage
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy the standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
