import { expect, test, describe } from "bun:test";
import { flagParser } from "../utils/flagParser.ts";

describe("flagParser", () => {
  test("returns empty object for no arguments", () => {
    expect(flagParser([])).toEqual({});
  });

  test("returns empty object when no recognized flags are passed", () => {
    expect(flagParser(["--unknown", "value"])).toEqual({});
  });

  test("parses --port with a valid numeric value", () => {
    expect(flagParser(["--port", "8080"])).toEqual({ port: 8080 });
  });

  test("parses --origin with a valid string value", () => {
    expect(flagParser(["--origin", "https://example.com"])).toEqual({
      origin: "https://example.com",
    });
  });

  test("sets clearCache to true when --clear-cache flag is present", () => {
    expect(flagParser(["--clear-cache"])).toEqual({ clearCache: true });
  });

  test("does not set clearCache when --clear-cache flag is absent", () => {
    const result = flagParser(["--port", "3000"]);
    expect(result.clearCache).toBeUndefined();
  });

  test("parses all flags together", () => {
    expect(
      flagParser([
        "--port",
        "8080",
        "--origin",
        "https://api.example.com",
        "--clear-cache",
      ]),
    ).toEqual({
      port: 8080,
      origin: "https://api.example.com",
      clearCache: true,
    });
  });

  test("parses flags in a different order", () => {
    expect(
      flagParser([
        "--clear-cache",
        "--origin",
        "https://example.com",
        "--port",
        "3000",
      ]),
    ).toEqual({
      port: 3000,
      origin: "https://example.com",
      clearCache: true,
    });
  });

  test("ignores port flag when value is missing (next arg starts with --)", () => {
    expect(flagParser(["--port", "--origin", "https://example.com"])).toEqual({
      origin: "https://example.com",
    });
  });

  test("ignores origin flag when value is missing (next arg starts with --)", () => {
    expect(flagParser(["--origin", "--port", "8080"])).toEqual({ port: 8080 });
  });

  test("ignores port when value is not a valid number", () => {
    expect(flagParser(["--port", "abc"])).toEqual({});
  });

  test("parses port value of 0", () => {
    expect(flagParser(["--port", "0"])).toEqual({ port: 0 });
  });

  test("parses port value of empty string as NaN (ignored)", () => {
    expect(flagParser(["--port", ""])).toEqual({});
  });

  test("handles --port as the last argument with no value", () => {
    expect(flagParser(["--port"])).toEqual({});
  });

  test("handles --origin as the last argument with no value", () => {
    expect(flagParser(["--origin"])).toEqual({});
  });

  test("parses port with negative number", () => {
    expect(flagParser(["--port", "-1"])).toEqual({ port: -1 });
  });

  test("parses port with floating point number (truncated by parseInt)", () => {
    expect(flagParser(["--port", "3000.5"])).toEqual({ port: 3000 });
  });

  test("handles --clear-cache appearing multiple times", () => {
    expect(flagParser(["--clear-cache", "--clear-cache"])).toEqual({
      clearCache: true,
    });
  });

  test("parses only --clear-cache when mixed with unknown flags", () => {
    expect(
      flagParser(["--foo", "bar", "--clear-cache", "--baz", "qux"]),
    ).toEqual({ clearCache: true });
  });

  test("handles consecutive flags without values", () => {
    expect(
      flagParser(["--clear-cache", "--port", "--origin", "--clear-cache"]),
    ).toEqual({ clearCache: true });
  });
});
