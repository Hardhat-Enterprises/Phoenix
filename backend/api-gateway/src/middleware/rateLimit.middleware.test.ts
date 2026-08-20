import { describe, expect, it, vi } from "vitest";
import { rateLimit } from "./rateLimit.middleware";
import { Request, Response, NextFunction } from "express";

describe("Rate Limit Middleware", () => {
    it("allows a request when it is below the rate limit", async () => {
        const store = {
            increment: vi.fn().mockResolvedValue(1),
            getTTL: vi.fn().mockResolvedValue(60),
            reset: vi.fn(),
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
            increment: vi.fn().mockResolvedValue(5),
            getTTL: vi.fn().mockResolvedValue(60),
            reset: vi.fn(),
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
            increment: vi.fn().mockResolvedValue(6),
            getTTL: vi.fn().mockResolvedValue(60),
            reset: vi.fn(),
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
            increment: vi.fn().mockRejectedValue(
                new Error("Redis unavailable"),
            ),
            getTTL: vi.fn(),
            reset: vi.fn(),
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
            increment: vi.fn().mockResolvedValue(2),
            getTTL: vi.fn().mockResolvedValue(45),
            reset: vi.fn(),
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
            increment: vi.fn().mockResolvedValue(1),
            getTTL: vi.fn().mockResolvedValue(60),
            reset: vi.fn(),
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

        expect(store.increment).toHaveBeenCalledWith(
            "ratelimit:api-key-policy:api-key:test-api-key",
            60,
        );

        expect(next).toHaveBeenCalled();
    });
        it("uses the authenticated user ID to identify the client", async () => {
        const store = {
            increment: vi.fn().mockResolvedValue(1),
            getTTL: vi.fn().mockResolvedValue(60),
            reset: vi.fn(),
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

        expect(store.increment).toHaveBeenCalledWith(
            "ratelimit:user-policy:user:user-123",
            60,
        );

        expect(next).toHaveBeenCalled();
    });
});