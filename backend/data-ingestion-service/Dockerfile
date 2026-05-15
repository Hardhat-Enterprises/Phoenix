FROM node:25 AS builder
WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.runtime.json ./

RUN npm install -g @dotenvx/dotenvx

COPY . .

RUN npm install
RUN npm run build:common
RUN npm run build:proto
RUN npm run build:ingestion

RUN echo "=== DIST ===" && ls -R dist


FROM node:25 AS runner
WORKDIR /app

# Install Python for inference runtime
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

ENV INGESTION_PROTO_PATH=/app/dist/libs/proto/ingestion.proto

# Python inference env
ENV PYTHON_BIN=/app/.venv/bin/python
ENV CORE_MODEL_SCRIPT_PATH=/app/libs/common/src/helper/core_model_integration.py

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tsconfig.runtime.json ./tsconfig.json

# Copy Python inference script into runtime image
COPY --from=builder /app/libs/common/src/helper/core_model_integration.py ./libs/common/src/helper/core_model_integration.py

# Copy requirements file
COPY --from=builder /app/libs/common/src/helper/requirements.txt ./libs/common/src/helper/requirements.txt

# Create Python virtual environment and install ML packages
RUN python3 -m venv /app/.venv
RUN /app/.venv/bin/pip install --no-cache-dir -r /app/libs/common/src/helper/requirements.txt

EXPOSE 50053

CMD ["node", "-r", "tsconfig-paths/register", "dist/data-ingestion-service/src/app.js"]