import { describe, expect, it, vi } from "vitest";
import { rateLimit } from "./rateLimit.middleware";
import { Request, Response, NextFunction } from "express";

describe("Rate Limit Middleware", () => {
    it("allows a request when it is below the rate limit", async () => {
        const store = {
            consume: vi.fn().mockResolvedValue({
                allowed: true,
                limit: 5,
                remaining: 4,
                resetAt: 60,
                retryAfterSeconds: 0,
            })
        };

        const policy = {
            name: "test-policy",
            limit: 5,
            windowSeconds: 60,
            identifierType: "ip" as const,
        };

        const req = {
            ip: "127.0.0.1",
        } as Request;

        const res = {
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as unknown as Response;

        const next = vi.fn() as NextFunction;

        const middleware = rateLimit(policy, store);

        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it("allows a request when it reaches the rate limit", async () => {
        const store = {
            consume: vi.fn().mockResolvedValue({
                allowed: true,
                limit: 5,
                remaining: 0,
                resetAt: 60,
                retryAfterSeconds: 0,
            }),
        };

        const policy = {
            name: "test-policy",
            limit: 5,
            windowSeconds: 60,
            identifierType: "ip" as const,
        };

        const req = {
            ip: "127.0.0.1",
        } as Request;

        const res = {
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as unknown as Response;

        const next = vi.fn() as NextFunction;

        const middleware = rateLimit(policy, store);

        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
        it("rejects a request when it exceeds the rate limit", async () => {
        const store = {
            consume: vi.fn().mockResolvedValue({
                allowed: false,
                limit: 5,
                remaining: 0,
                resetAt: 60,
                retryAfterSeconds: 60,
            }),
        };    

        const policy = {
            name: "test-policy",
            limit: 5,
            windowSeconds: 60,
            identifierType: "ip" as const,
        };

        const req = {
            ip: "127.0.0.1",
        } as Request;

        const res = {
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as unknown as Response;

        const next = vi.fn() as NextFunction;

        const middleware = rateLimit(policy, store);

        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith({
            status: 429,
            message: "Too many requests. Please try again later.",
            retryAfter: 60,
        });
        expect(next).not.toHaveBeenCalled();
    });
        it("allows the request when the rate-limit store is unavailable", async () => {
        const store = {
            consume: vi.fn().mockRejectedValue(
                new Error("Redis unavailable"),
            ),
        };

        const policy = {
            name: "test-policy",
            limit: 5,
            windowSeconds: 60,
            identifierType: "ip" as const,
        };

        const req = {
            ip: "127.0.0.1",
        } as Request;

        const res = {
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as unknown as Response;

        const next = vi.fn() as NextFunction;

        const middleware = rateLimit(policy, store);

        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
        it("sets the correct rate limit headers", async () => {
        const store = {
             consume: vi.fn().mockResolvedValue({
                allowed: true,
                limit: 5,
                remaining: 3,
                resetAt: 45,
                retryAfterSeconds: 0,
             }),
        };

        const policy = {
            name: "test-policy",
            limit: 5,
            windowSeconds: 60,
            identifierType: "ip" as const,
        };

        const req = {
            ip: "127.0.0.1",
        } as Request;

        const res = {
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as unknown as Response;

        const next = vi.fn() as NextFunction;

        const middleware = rateLimit(policy, store);

        await middleware(req, res, next);

        expect(res.setHeader).toHaveBeenCalledWith(
            "RateLimit-Limit",
            5,
        );

        expect(res.setHeader).toHaveBeenCalledWith(
            "RateLimit-Remaining",
            3,
        );

        expect(res.setHeader).toHaveBeenCalledWith(
            "RateLimit-Reset",
            45,
        );
    });
        it("uses the API key to identify the client", async () => {
        const store = {
             consume: vi.fn().mockResolvedValue({
                allowed: true,
                limit: 5,
                remaining: 4,
                resetAt: 60,
                retryAfterSeconds: 0,
             }),
        };

        const policy = {
            name: "api-key-policy",
            limit: 5,
            windowSeconds: 60,
            identifierType: "api-key" as const,
        };

        const req = {
            ip: "127.0.0.1",
            headers: {
                "x-api-key": "test-api-key",
            },
        } as unknown as Request;

        const res = {
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as unknown as Response;

        const next = vi.fn() as NextFunction;

        const middleware = rateLimit(policy, store);

        await middleware(req, res, next);

        expect(store.consume).toHaveBeenCalledWith(
            `phoenix:ratelimit:${process.env.NODE_ENV}:api-key-policy:api-key%3Atest-api-key`,
            5,
            60,
        );

        expect(next).toHaveBeenCalled();
    });
        it("uses the authenticated user ID to identify the client", async () => {
        const store = {
             consume: vi.fn().mockResolvedValue({
                allowed: true,
                limit: 10,
                remaining: 9,
                resetAt: 60,
                retryAfterSeconds: 0,
             }),
        };

        const policy = {
            name: "user-policy",
            limit: 10,
            windowSeconds: 60,
            identifierType: "user" as const,
        };

        const req = {
            ip: "127.0.0.1",
            user: {
                user_id: "user-123",
            },
        } as unknown as Request;

        const res = {
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        } as unknown as Response;

        const next = vi.fn() as NextFunction

        const middleware = rateLimit(policy, store);

        await middleware(req, res, next);

        expect(store.consume).toHaveBeenCalledWith(
            `phoenix:ratelimit:${process.env.NODE_ENV}:user-policy:user%3Auser-123`,
            10,
            60,
        );

        expect(next).toHaveBeenCalled();
    });
});