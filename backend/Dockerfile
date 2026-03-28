FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY .npmrc* ./
RUN npm install --omit=dev --legacy-peer-deps
COPY . .
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1
CMD ["node", "server/index.js"]
