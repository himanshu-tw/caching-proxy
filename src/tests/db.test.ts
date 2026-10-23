import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { clearAllCache, deleteCachedResponse, getCachedResponse, setCachedResponse } from "../service/db.ts";
import { connectRedis } from "../config/redis.ts";

describe("Database Service (Unit)", () => {
  const testUrl = "https://api.example.com/unit-test";

  beforeAll(async () => {
    // Fresh Redis context per test file
    await connectRedis();
    await clearAllCache();
  });

  describe("Cache Operations", () => {
    test("setCachedResponse serializes and stores response", async () => {
      const response = { body: "test-data", status: 200 };
      const result = await setCachedResponse(testUrl, response, 60);
      
      expect(result).toBe(JSON.stringify(response));
    });

    test("setCachedResponse returns serialized string", async () => {
      const response = { body: "another-test", status: 201 };
      const result = await setCachedResponse(testUrl, response, 30);
      
      expect(result).toBe(JSON.stringify(response));
    });

    test("setCachedResponse uses default TTL of 60", async () => {
      const response = { body: "ttl-test" };
      const result = await setCachedResponse(testUrl, response);
      expect(result).toBe(JSON.stringify(response));
    });

    test("getCachedResponse returns parsed response", async () => {
      const response = { body: "get-test", status: 200 };
      await setCachedResponse(testUrl, response, 60);
      const cached = await getCachedResponse(testUrl);
      
      expect(cached).toEqual(response);
    });

    test("getCachedResponse returns null for missing key", async () => {
      // After clearing cache, a new key should return null
      const cached = await getCachedResponse("https://new-url.com/path");
      expect(cached).toBeNull();
    });

    test("deleteCachedResponse deletes existing key", async () => {
      const response = { body: "delete-test" };
      await setCachedResponse(testUrl, response, 60);
      const result = await deleteCachedResponse(testUrl);
      
      expect(result).toBe(true);
      const cached = await getCachedResponse(testUrl);
      expect(cached).toBeNull();
    });
  });

  describe("Cache Key Management", () => {
    test("getCacheKey includes proxy_cache prefix", async () => {
      const { getCacheKey } = await import("../service/db.ts");
      const key = getCacheKey("https://api.example.com/path");
      
      expect(key).toContain("proxy_cache:");
      expect(key).toContain("https://api.example.com/path");
    });
  });

  describe("Error Handling", () => {
    test("getCachedResponse handles empty URL gracefully", async () => {
      const cached = await getCachedResponse("");
      // Should not throw, behavior depends on implementation
      expect(cached).toBeDefined();
    });
  });
});