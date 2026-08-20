import { Request, Response, NextFunction } from "express";

interface RateLimitPolicy {
    name: string;
    limit: number;
    windowSeconds: number;
    identifierType: "user" | "ip" | "api-key";
}

interface RateLimitStore {
    increment(key: string, windowSeconds: number): Promise<number>;
    getTTL(key: string): Promise<number>;
    reset(key: string): Promise<void>;
}

const getClientIdentifier = (
    req: Request,
    identifierType: RateLimitPolicy["identifierType"],
): string | null => {
    if (identifierType === "user") {
        const user = (req as any).user;

        if (!user?.user_id) {
            return null;
        }

        return `user:${user.user_id}`;
    }

    if (identifierType === "ip") {
        return `ip:${req.ip}`;
    }

    if (identifierType === "api-key") {
        const apiKey = req.headers["x-api-key"];

        if (!apiKey || Array.isArray(apiKey)) {
            return null;
        }

        return `api-key:${apiKey}`;
    }
    return null;
};

const buildsRateLimitKey = (
    policy: RateLimitPolicy,
    identifier: string,
): string => {
    return `ratelimit:${policy.name}:${identifier}`;
};

export const rateLimit = (
    policy: RateLimitPolicy,
    store: RateLimitStore,
) => {
    return async (
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        try {
            const identifier = getClientIdentifier(
                req,
                policy.identifierType,
            );

            if (!identifier) {
                res.status(401).json({
                    status: 401,
                    message: "Unable to identify request client",
                });
                return;
            }

            const key = buildsRateLimitKey(policy, identifier);

            const count = await store.increment(
                key,
                policy.windowSeconds,
            );

            const ttl = await store.getTTL(key);

            const remaining = Math.max(
               policy.limit - count,
               0,
            );

            res.setHeader("RateLimit-Limit", policy.limit);
            res.setHeader("RateLimit-Remaining", remaining);
            res.setHeader("RateLimit-Reset", ttl);

            if (count > policy.limit) {
                res.setHeader("Retry-After", ttl);

                res.status(429).json({
                    status: 429,
                    message: "Too many requests. Please try again later.",
                    retryAfter: ttl,
                });

                return;
            }

            next();
        } catch (error) {
            console.error("Rate limit store error:", error);

            // if Redis fails to open / unavailable
            next();
        }
    };
};