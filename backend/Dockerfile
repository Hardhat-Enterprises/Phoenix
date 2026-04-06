FROM node:25 AS builder
WORKDIR /app

# Copy package files and tsconfig
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
#COPY libs ./libs 
#COPY api-gateway ./api-gateway
#COPY tsconfig.json ./  

COPY . .

# Build TypeScript
# Build libraries first
#RUN npx tsc -b libs/common || exit 1

# Build api-gateway
#RUN npx tsc -b api-gateway || exit 1
#RUN npx tsc -p api-gateway/tsconfig.json || exit 1


# Build All
RUN npx tsc -b

# Ensure dist folder exists
RUN echo "CHECK APP FOLDER:" && ls -R .
RUN echo "CHECK DIST:" && ls -R dist || echo "dist not found"

FROM node:25 AS runner
WORKDIR /app

# Copy runtime files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Copy tsconfig for path aliases
COPY --from=builder /app/tsconfig.json ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "-r", "tsconfig-paths/register", "dist/api-gateway/src/app.js"]
