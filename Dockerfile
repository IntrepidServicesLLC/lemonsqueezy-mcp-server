# This file is a duplicate of Containerfile for registry and platform compatibility.
# Many registries (e.g. Smithery) and CI systems look for the filename "Dockerfile"
# by convention. The build is identical; you can use either Docker or Podman to build.
# See README "Containers" section and CONTAINERS.md for details.
#
# Build: docker build -t lemonsqueezy-mcp .   OR   podman build -f Dockerfile -t lemonsqueezy-mcp .

# Multi-stage build for smaller image size
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source files
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose webhook port (default 3000, configurable via env)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start the server
CMD ["node", "dist/index.js"]
