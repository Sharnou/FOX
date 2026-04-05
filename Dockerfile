FROM node:24-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init wget

WORKDIR /app

# Copy backend package files first (layer cache)
COPY backend/package*.json ./

# Install backend dependencies
RUN npm install --legacy-peer-deps --omit=dev

# Copy all backend source
COPY backend/ .

# Railway injects PORT at runtime
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Docker-level healthcheck — confirms server responds on GET /
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://0.0.0.0:${PORT:-3000}/ || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/index.js"]
