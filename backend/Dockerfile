FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
COPY .npmrc* ./
RUN npm install --omit=dev --legacy-peer-deps
COPY . .
EXPOSE 3001
CMD ["node", "server/index.js"]
