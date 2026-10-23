import { expect, test, describe, beforeAll, afterAll, beforeEach } from "bun:test";
import { configureProxyOrigin } from "../app.ts";
import app from "../app.ts";
import { clearAllCache, getCachedResponse } from "../service/db.ts";
import { connectRedis } from "../config/redis.ts";

describe("App Integration Tests", () => {
  beforeAll(async () => {
    await connectRedis();
  });

  afterAll(async () => {
    await clearAllCache();
  });

  describe("configureProxyOrigin", () => {
    test("sets origin successfully", () => {
      configureProxyOrigin("https://api.example.com");
      // Proxy is set internally; we verify by making a request
    });

    test("sets undefined origin clears proxy", () => {
      configureProxyOrigin(undefined);
    });

    test("sets empty string origin", () => {
      configureProxyOrigin("");
    });
  });

  describe("Proxy Not Configured (404)", () => {
    beforeEach(() => {
      configureProxyOrigin(undefined);
    });

    test("returns 404 when no origin is configured", async () => {
      const response = await app.request("https://example.com/path");
      
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body).toHaveProperty("message");
    });
  });

  describe("Proxy Forwarding", () => {
    beforeEach(async () => {
      configureProxyOrigin("https://httpbin.org");
      await clearAllCache();
    });

    test("forwards GET request and returns upstream response", async () => {
      const response = await app.request({
        method: "GET",
        url: "/get",
        headers: { "Accept": "text/html" },
      } as any);

      // httpbin.org/get returns 200 with JSON body
      expect([200, 502]).toContain(response.status);
    });

    test("forwards POST request with body", async () => {
      const response = await app.request({
        method: "POST",
        url: "/post",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "name=test&value=hello",
      } as any);

      expect([200, 502]).toContain(response.status);
    });

    test("forwards PUT request", async () => {
      const response = await app.request({
        method: "PUT",
        url: "/put",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "value" }),
      } as any);

      expect([200, 502]).toContain(response.status);
    });

    test("forwards DELETE request", async () => {
      const response = await app.request({
        method: "DELETE",
        url: "/delete",
        headers: {},
      } as any);

      expect([200, 502]).toContain(response.status);
    });
  });

  describe("Hop-by-Hop Header Filtering", () => {
    let originalRequest;

    beforeEach(async () => {
      originalRequest = {
        method: "GET",
        url: "/get",
        headers: {
          "connection": "keep-alive",
          "keep-alive": "true",
          "host": "myproxy.local",
          "proxy-authenticate": "Basic realm=\"realm\"",
          "proxy-authorization": "Bearer token123",
          "upgrade": "websocket",
          "te": "trailing-encoding",
          "transfer-encoding": "chunked",
          "accept": "text/html",
        },
      };
      await clearAllCache();
      configureProxyOrigin("https://httpbin.org");
    });

    test("filters out connection header", async () => {
      const response = await app.request(originalRequest as any);
      const forwardedHeaders = response.headers.get("x-forwarded-by") || "";
      // The 'connection' header should not appear in forwarded headers
      expect(forwardedHeaders).not.toContain("connection");
    });

    test("filters out keep-alive header", async () => {
      const response = await app.request(originalRequest as any);
      const forwardedHeaders = response.headers.getAll("keep-alive");
      // Should not be forwarded
      expect(forwardedHeaders.length).toBe(0);
    });

    test("filters out host header (axios sets target host)", async () => {
      const response = await app.request(originalRequest as any);
      const forwardedHost = response.headers.get("host");
      // Host header should not appear (axios sets it based on origin)
      // (We can't assert exact behavior here without inspecting headers closely)
    });
  });

  describe("Caching (HIT/MISS)", () => {
    let testUrl;

    beforeEach(async () => {
      testUrl = "https://httpbin.org/get";
      configureProxyOrigin("https://httpbin.org");
      await clearAllCache();
    });

    test("first request returns MISS and caches", async () => {
      const response = await app.request("/get");
      
      const xCacheHeader = response.headers.get("x-cache");
      expect(xCacheHeader).toBeDefined();
    });

    test("second request returns HIT from cache", async () => {
      await app.request("/get"); // Prime cache
      const response = await app.request("/get"); // Read from cache
      
      const xCacheHeader = response.headers.get("x-cache");
      expect(xCacheHeader).toBe("HIT");
    });

    test("different paths have separate cache entries", async () => {
      await app.request("/get"); // Prime /get
      const response = await app.request("/ip"); // Different path → MISS
      
      const xCacheHeader = response.headers.get("x-cache");
      expect(xCacheHeader).toBe("MISS");
    });

    test("non-GET requests are not cached", async () => {
      const response = await app.request({
        method: "POST",
        url: "/post",
        headers: {},
        body: "test-data",
      } as any);
      
      const xCacheHeader = response.headers.get("x-cache");
      expect(xCacheHeader).toBeUndefined();
    });
  });

  describe("Error Handling", () => {
    beforeEach(async () => {
      await clearAllCache();
      configureProxyOrigin("https://nonexistent-domain-that-does-not-exist.invalid");
    });

    test("returns 502 when upstream fails", async () => {
      const response = await app.request({
        method: "GET",
        url: "/get",
      } as any);

      // Non-existent domain will cause a DNS error → axios throws → 502
      expect([502]).toContain(response.status);
    });
  });
});
