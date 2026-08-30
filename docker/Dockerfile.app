# Dockerfile for the Mastra + Next.js monolith.
# Mastra runs in-process with Next.js — no separate agent service needed.
FROM node:22.23.2-slim AS builder

WORKDIR /app

# Install the locked tree. @mastra/memory is pinned exactly at 1.26.1.
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

# Build the Next.js application (standalone output)
RUN npm run build

# Production stage
FROM node:22.23.2-slim AS runner

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
