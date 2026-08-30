import { Request, Response, NextFunction} from "express";
import { buildRateLimitKey} from "@phoenix/common/rate-limit/rate-limit-key";

interface RateLimitPolicy {
    name: string;
    limit: number;
    windowSeconds: number;
    identifierType: "user" | "ip" | "api-key";
}

interface RateLimitResult {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfterSeconds: number;
}

interface RateLimitStore {
    consume(
        key: string,
        limit: number,
        windowSeconds: number,
    ): Promise<RateLimitResult>;
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

    if (identifierType == "ip") {
        return `ip:${req.ip}`;
    }

    if (identifierType == "api-key") {
        const apiKey = req.headers["x-api-key"];

        if (!apiKey || Array.isArray(apiKey)) {
            return null;
        }

        return `api-key:${apiKey}`;
    }

    return null;
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
            const key = buildRateLimitKey({
                environment: process.env.NODE_ENV || "development",
                policy: policy.name,
                clientIdentifier: identifier,
            });

            const result = await store.consume (
                key,
                policy.limit,
                policy.windowSeconds,
            );

            res.setHeader("RateLimit-Limit", result.limit);
            res.setHeader("RateLimit-Remaining", result.remaining);
            res.setHeader("RateLimit-Reset", result.resetAt);

            if (!result.allowed) {
                res.setHeader(
                    "Retry-After",
                    result.retryAfterSeconds,
                );

                res.status(429). json({
                    status: 429,
                    message: "Too many requests. Please try again later.",
                    retryAfter: result.retryAfterSeconds,
                });

                return;
            }

            next();
        } catch (error) {
            console.error("Rate limit store error: ", error);

            // If Redis is unavailable, allow the request to continue
            next();
        }
    };
};