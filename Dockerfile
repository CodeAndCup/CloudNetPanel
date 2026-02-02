# Dockerfile for CloudNet Panel
# Multi-stage build for optimized production image

# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy client source
COPY client/ ./

# Build frontend
RUN npm run build

# ============================================
# Stage 2: Build Server Dependencies
# ============================================
FROM node:20-alpine AS server-builder

WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci --only=production

# ============================================
# Stage 3: Production Image
# ============================================
FROM node:20-alpine

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S cloudnet && \
    adduser -S cloudnet -u 1001 -G cloudnet

# Copy server dependencies from builder
COPY --from=server-builder /app/server/node_modules ./server/node_modules

# Copy server source
COPY --chown=cloudnet:cloudnet server/ ./server/

# Copy built frontend from builder
COPY --from=frontend-builder --chown=cloudnet:cloudnet /app/client/dist ./client/dist

# Copy scripts
COPY --chown=cloudnet:cloudnet scripts/ ./scripts/

# Copy root package.json for scripts
COPY --chown=cloudnet:cloudnet package.json ./

# Create necessary directories
RUN mkdir -p /app/server/database /app/server/backups /app/server/logs && \
    chown -R cloudnet:cloudnet /app/server/database /app/server/backups /app/server/logs

# Switch to non-root user
USER cloudnet

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server/index.js"]
