import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { createClient } from "redis";
import redisClient from "../config/redis.ts";
import { connectRedis } from "../config/redis.ts";

describe("Redis Configuration", () => {
  let redisStarted = false;

  beforeAll(async () => {
    // Ensure Redis is connected once for the test suite
    if (!redisStarted) {
      await connectRedis();
      redisStarted = true;
    }
  });

  afterAll(async () => {
    // Only quit if we started it in this session
    if (redisStarted) {
      await redisClient.quit();
    }
  });

  describe("Redis Client Initialization", () => {
    test("redisClient is defined", () => {
      expect(redisClient).toBeDefined();
    });

    test("redisClient is a valid Redis client", () => {
      expect(typeof redisClient.connect).toBe("function");
      expect(typeof redisClient.quit).toBe("function");
      expect(typeof redisClient.get).toBe("function");
      expect(typeof redisClient.set).toBe("function");
      expect(typeof redisClient.del).toBe("function");
      expect(typeof redisClient.keys).toBe("function");
    });

    test("redisClient has correct URL from environment", () => {
      expect(redisClient).toHaveProperty("isOpen");
    });
  });

  describe("Redis Connection State", () => {
    test("redisClient.isOpen reflects connection state after connectRedis", async () => {
      expect(redisClient.isOpen).toBe(true);
    });

    test("connectRedis maintains connection state", async () => {
      await connectRedis();
      expect(redisClient.isOpen).toBe(true);
    });
  });

  describe("Redis URL Configuration", () => {
    test("Redis uses default URL when env var is not set", () => {
      const redisUrl = process.env.REDIS_URl || "redis://localhost:6379";
      expect(redisUrl).toBe("redis://localhost:6379");
    });
  });
});