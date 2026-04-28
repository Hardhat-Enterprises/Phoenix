FROM node:25 AS builder
WORKDIR /app
 
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.runtime.json ./
RUN apt-get update 
RUN npm install -g @dotenvx/dotenvx
COPY . .
RUN npm install 
RUN npm run build:common
RUN npm run build:proto
RUN npm run build:notification
 
RUN echo "=== DIST ===" && ls -R dist
 
 
FROM node:25 AS runner
WORKDIR /app
 
ENV NOTIFICATION_PROTO_PATH=/app/dist/libs/proto/notification.proto
 
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tsconfig.runtime.json ./tsconfig.json
 
EXPOSE 50052
 
CMD ["node", "-r", "tsconfig-paths/register", "dist/notification-service/src/app.js"]