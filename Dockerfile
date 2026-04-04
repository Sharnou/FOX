FROM node:22-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

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

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/index.js"]
