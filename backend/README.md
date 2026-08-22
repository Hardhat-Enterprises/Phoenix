# 🚀 Phoenix Backend – Docker Setup Guide

This guide explains how to build, run, and verify the backend services using Docker.

---

## 📦 Prerequisites

- Install Docker
- Ensure Docker is running

---

## 🌐 Create Docker Network

```bash
docker network create phoenix-net
```

---

## 🏗️ Build Docker Images

```bash
docker build -f api-gateway/Dockerfile -t phoenix-gateway .
docker build -f user-service/Dockerfile -t phoenix-user .
```

---

## ▶️ Run Containers

### User Service (gRPC)

```bash
docker run -d \
  --name user-service \
  --network phoenix-net \
  -p 50051:50051 \
  phoenix-user
```

### API Gateway

```bash
docker run -d \
  --name api-gateway \
  --network phoenix-net \
  -p 3000:3000 \
  -e USER_SERVICE_URL=user-service:50051 \
  phoenix-gateway
```

---

## 🩺 Health Checks

```bash
curl http://localhost:3000/health
curl http://localhost:3000/users/health
```

---

## 🧪 Debugging

```bash
docker ps
docker logs api-gateway
docker logs user-service
```

---

## 🛑 Stop & Clean Up

```bash
docker stop api-gateway user-service
docker rm api-gateway user-service
```

---

## 💡 Environment Variables

Docker:

```
USER_SERVICE_URL=user-service:50051
TEAVS_ADCRS_SIGNING_SECRET=<random-secret-with-at-least-32-characters>
```

Local:

```
USER_SERVICE_URL=localhost:50051
TEAVS_ADCRS_SIGNING_SECRET=<random-secret-with-at-least-32-characters>
```

`TEAVS_ADCRS_SIGNING_SECRET` is used to create the HMAC-SHA256 signature on
TEAVS alert payloads generated from ADCRS risk-scoring output. Keep the real
value in `.env` or `.env.docker`; never commit it to source control.
