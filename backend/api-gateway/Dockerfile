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
RUN npm run build:gateway
 
RUN echo "=== DIST ===" && ls -R dist
 
 
FROM node:25 AS runner
WORKDIR /app
 
ENV USER_PROTO_PATH=/app/dist/libs/proto/user.proto
ENV USER_SERVICE_URL=user-service:50051
 
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tsconfig.runtime.json ./tsconfig.json
 
EXPOSE 3000
 
CMD ["node", "-r", "tsconfig-paths/register", "dist/api-gateway/src/app.js"]