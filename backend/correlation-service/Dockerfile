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
RUN npm run build:correlation-service

RUN echo "=== DIST ===" && ls -R dist


FROM node:25 AS runner

WORKDIR /app

# Python runtime for correlation component
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*


ENV CORRELATION_PROTO_PATH=/app/dist/libs/proto/correlation.proto

ENV PYTHON_BIN=/app/.venv/bin/python

ENV CORRELATION_API_PATH=/app/correlation/src/api.py

ENV PYTHONUNBUFFERED=1


COPY --from=builder /app/package*.json ./

COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/dist ./dist

COPY --from=builder /app/tsconfig.runtime.json ./tsconfig.json


# Copy correlation Python implementation
COPY --from=builder \
    /app/correlation \
    ./correlation


# Python dependency definition
COPY --from=builder \
    /app/requirements.txt \
    ./requirements.txt


# Create isolated Python environment
RUN python3 -m venv /app/.venv


# Install correlation dependencies
RUN /app/.venv/bin/pip install \
    --no-cache-dir \
    -r /app/requirements.txt


EXPOSE 50055


CMD [
  "node",
  "-r",
  "tsconfig-paths/register",
  "dist/correlation-service/src/app.js"
]