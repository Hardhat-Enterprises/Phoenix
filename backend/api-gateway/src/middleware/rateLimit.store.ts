// rateLimit.config.ts

import { redisClient } from "@phoenix/common";
import { RedisRateLimitStore } from "@phoenix/common/rate-limit/redis-rate-limit.store"

export const rateLimitStore = new RedisRateLimitStore(redisClient);

export const loginRateLimit = {
    name:  "login",
    limit: 5,
    windowSeconds: 60,
    identifierType: "ip" as const,
};

export const authenticatedUserRateLimit = {
    name: "authenticated-user",
    limit: 100,
    windowSeconds: 60,
    identifierType: "user" as const,
};

export const standardReadRateLimit = {
    name: "standard-read",
    limit: 100,
    windowSeconds: 60,
    identifierType: "user" as const,
};

export const writeRateLimit = {
    name: "write",
    limit: 30,
    windowSeconds: 60,
    identifierType: "user" as const,
};

export const expensiveOperationRateLimit = {
    name: "expensive-operation",
    limit: 10,
    windowSeconds: 60,
    identifierType: "user" as const,
};


