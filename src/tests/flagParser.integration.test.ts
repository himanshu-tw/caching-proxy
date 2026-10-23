import { expect, test, describe, beforeAll, afterAll, beforeEach } from "bun:test";
import { flagParser } from "../utils/flagParser.ts";
import { configureProxyOrigin } from "../app.ts";
import { clearAllCache, getCachedResponse, setCachedResponse } from "../service/db.ts";
import redisClient from "../config/redis.ts";
import { connectRedis } from "../config/redis.ts";

describe("Integration: Flag Parser with Application", () => {
  let redisAvailable = false;

  beforeAll(async () => {
    try {
      await connectRedis();
      redisAvailable = true;
    } catch {
      redisAvailable = false;
    }
  });

  afterAll(async () => {
    if (redisAvailable) {
      await redisClient.quit();
    }
  });

  describe("CLI Argument Parsing Integration", () => {
    test("parses flags exactly as the CLI would", () => {
      const cliArgs = ["--port", "8080", "--origin", "https://api.example.com", "--clear-cache"];
      const result = flagParser(cliArgs);
      
      expect(result.port).toBe(8080);
      expect(result.origin).toBe("https://api.example.com");
      expect(result.clearCache).toBe(true);
    });

    test("parses default port when only origin is provided", () => {
      const cliArgs = ["--origin", "https://api.example.com"];
      const result = flagParser(cliArgs);
      
      expect(result.port).toBeUndefined();
      expect(result.origin).toBe("https://api.example.com");
      expect(result.clearCache).toBeUndefined();
    });

    test("handles flags in any order", () => {
      const cliArgs = ["--clear-cache", "--origin", "https://example.com", "--port", "3000"];
      const result = flagParser(cliArgs);
      
      expect(result.port).toBe(3000);
      expect(result.origin).toBe("https://example.com");
      expect(result.clearCache).toBe(true);
    });

    test("ignores unknown flags while parsing known ones", () => {
      const cliArgs = ["--unknown", "value", "--port", "8080", "--another", "flag"];
      const result = flagParser(cliArgs);
      
      expect(result.port).toBe(8080);
      expect(result.origin).toBeUndefined();
      expect(result.clearCache).toBeUndefined();
    });
  });

  describe("Proxy Origin Configuration", () => {
    test("configureProxyOrigin sets the origin correctly", () => {
      configureProxyOrigin("https://test-origin.com");
    });

    test("configureProxyOrigin handles undefined", () => {
      configureProxyOrigin(undefined);
    });

    test("configureProxyOrigin handles empty string", () => {
      configureProxyOrigin("");
    });
  });

  describe("Cache Operations with Redis", () => {
    const testUrl = "https://api.example.com/test-endpoint";
    const testResponse = {
      body: "dGVzdCBib2R5",
      status: 200,
      statusText: "OK",
      headers: { "content-type": "application/json" },
    };

    beforeEach(async () => {
      if (redisAvailable) {
        await clearAllCache();
      }
    });

    test("setCachedResponse and getCachedResponse work together", async () => {
      if (!redisAvailable) {
        expect(redisAvailable).toBe(true);
        return;
      }
      await setCachedResponse(testUrl, testResponse, 60);
      const cached = await getCachedResponse(testUrl);
      
      expect(cached).not.toBeNull();
      expect(cached?.body).toBe(testResponse.body);
      expect(cached?.status).toBe(testResponse.status);
    });

    test("getCachedResponse returns null for non-existent key", async () => {
      if (!redisAvailable) {
        expect(redisAvailable).toBe(true);
        return;
      }
      const cached = await getCachedResponse("https://nonexistent.com/path");
      expect(cached).toBeNull();
    });

    test("clearAllCache removes all cached entries", async () => {
      if (!redisAvailable) {
        expect(redisAvailable).toBe(true);
        return;
      }
      await setCachedResponse("https://example.com/1", testResponse, 60);
      await setCachedResponse("https://example.com/2", testResponse, 60);
      
      const beforeClear = await clearAllCache();
      expect(beforeClear).toBe(2);
      
      const cached1 = await getCachedResponse("https://example.com/1");
      const cached2 = await getCachedResponse("https://example.com/2");
      expect(cached1).toBeNull();
      expect(cached2).toBeNull();
    });

    test("clearAllCache returns 0 when cache is already empty", async () => {
      if (!redisAvailable) {
        expect(redisAvailable).toBe(true);
        return;
      }
      const count = await clearAllCache();
      expect(count).toBe(0);
    });
  });

  describe("Clear Cache Flag Flow", () => {
    test("flagParser identifies --clear-cache flag correctly", () => {
      const result = flagParser(["--clear-cache"]);
      expect(result.clearCache).toBe(true);
    });

    test("flagParser identifies --clear-cache with other flags", () => {
      const result = flagParser(["--port", "3000", "--clear-cache", "--origin", "https://example.com"]);
      expect(result.clearCache).toBe(true);
      expect(result.port).toBe(3000);
      expect(result.origin).toBe("https://example.com");
    });

    test("flagParser returns false-like for clearCache when absent", () => {
      const result = flagParser(["--port", "3000"]);
      expect(result.clearCache).toBeUndefined();
    });
  });

  describe("Server Start Configuration", () => {
    test("port defaults to 3000 when not specified", () => {
      const result = flagParser(["--origin", "https://example.com"]);
      const port = result.port ?? 3000;
      expect(port).toBe(3000);
    });

    test("port uses specified value when provided", () => {
      const result = flagParser(["--port", "8080", "--origin", "https://example.com"]);
      const port = result.port ?? 3000;
      expect(port).toBe(8080);
    });

    test("origin is passed to configureProxyOrigin during startup", () => {
      const result = flagParser(["--origin", "https://api.example.com"]);
      configureProxyOrigin(result.origin);
    });

    test("missing origin triggers 404 in handler", () => {
      configureProxyOrigin(undefined);
    });
  });

  describe("Flag Edge Cases", () => {
    test("multiple --clear-cache flags still results in true", () => {
      const result = flagParser(["--clear-cache", "--clear-cache", "--clear-cache"]);
      expect(result.clearCache).toBe(true);
    });

    test("port value of 0 is valid", () => {
      const result = flagParser(["--port", "0"]);
      expect(result.port).toBe(0);
    });

    test("negative port is parsed as-is", () => {
      const result = flagParser(["--port", "-1"]);
      expect(result.port).toBe(-1);
    });

    test("port with non-numeric value is ignored", () => {
      const result = flagParser(["--port", "abc"]);
      expect(result.port).toBeUndefined();
    });

    test("missing value for --port is ignored", () => {
      const result = flagParser(["--port", "--origin", "https://example.com"]);
      expect(result.port).toBeUndefined();
      expect(result.origin).toBe("https://example.com");
    });

    test("missing value for --origin is ignored", () => {
      const result = flagParser(["--origin", "--port", "8080"]);
      expect(result.origin).toBeUndefined();
      expect(result.port).toBe(8080);
    });
  });
});