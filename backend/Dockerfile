FROM node:25 AS builder
WORKDIR /app
 
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.runtime.json ./
RUN npm install
 
COPY . .
 
RUN npm run build:common
RUN npm run build:proto
RUN npm run build:gateway
 
RUN echo "=== DIST ===" && ls -R dist
 
 
FROM node:25 AS runner
WORKDIR /app
 
ENV NODE_ENV=production
 
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tsconfig.runtime.json ./tsconfig.json
 
EXPOSE 3000
 
CMD ["node", "-r", "tsconfig-paths/register", "dist/api-gateway/src/app.js"]