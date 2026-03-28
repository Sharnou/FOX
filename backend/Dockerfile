FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./
COPY .npmrc ./

# Install production dependencies
RUN npm install --omit=dev --legacy-peer-deps

# Copy all source files
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

# Start the server
CMD ["node", "server/index.js"]
