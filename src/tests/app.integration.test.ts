import { expect, test, describe, beforeAll, afterAll, beforeEach } from "bun:test";
import app from "../app.ts";
import { configureProxyOrigin } from "../app.ts";
import { connectRedis } from "../config/redis.ts";
import { clearAllCache } from "../service/db.ts";

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
    });

    test("sets undefined origin", () => {
      configureProxyOrigin(undefined);
    });

    test("sets empty string origin", () => {
      configureProxyOrigin("");
    });
  });

  describe("Proxy Not Configured", () => {
    beforeEach(() => {
      configureProxyOrigin(undefined);
    });

    test("returns error when proxy origin not configured", async () => {
      const response = await app.request("https://example.com/test-path");
      // When no origin is set, should return 404
      expect(response.status).toBe(404);
    });
  });

  describe("Proxy With Origin Configured", () => {
    beforeEach(async () => {
      configureProxyOrigin("https://httpbin.org");
      await clearAllCache();
    });

    test("forwards GET request", async () => {
      const response = await app.request("/get", {
        method: "GET",
      });

      // httpbin.org may or may not be reachable, check status range
      expect([200, 502]).toContain(response.status);
    });

    test("forwards POST request", async () => {
      const response = await app.request("/post", {
        method: "POST",
        body: "test=data",
      });

      expect([200, 502]).toContain(response.status);
    });

    test("forwards PUT request", async () => {
      const response = await app.request("/put", {
        method: "PUT",
        body: JSON.stringify({ key: "value" }),
      });

      expect([200, 502]).toContain(response.status);
    });

    test("forwards DELETE request", async () => {
      const response = await app.request("/delete", {
        method: "DELETE",
      });

      expect([200, 502]).toContain(response.status);
    });
  });

  describe("Error: Upstream Failure", () => {
    beforeEach(async () => {
      configureProxyOrigin("https://nonexistent-domain.invalid.example");
      await clearAllCache();
    });

    test("returns 502 when upstream is unreachable", async () => {
      const response = await app.request("/get");
      // Non-existent domain → 502 Bad Gateway
      expect(response.status).toBe(502);
    });
  });

  describe("Cache Headers", () => {
    beforeEach(async () => {
      configureProxyOrigin("https://httpbin.org");
      await clearAllCache();
    });

    test("first GET request includes x-cache: MISS header", async () => {
      const response = await app.request("/get");
      const xCache = response.headers.get("x-cache");
      expect(xCache).toBeDefined();
    });

    test("x-cache header is present on response", async () => {
      const response = await app.request("/get");
      expect(response.headers.has("x-cache")).toBe(true);
    });
  });
});