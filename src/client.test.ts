import type { Logger } from "pino";
import { vi, expect, test, describe, beforeEach, Mocked } from "vitest";

import type { InferFromSchema } from "./types";

import { makeQueryClient } from "./client";

import { Type } from "@sinclair/typebox";
import { Projection, Collection } from "./schemas";

const schema = Collection(
  Projection({
    title: Type.String(),
    director: Projection({
      name: Type.String(),
    }),
  }),
  { filter: `_type == "movie"` },
);

const mockFn = vi.fn(() =>
  Promise.resolve([
    { _key: null, title: "Snatch", director: { name: "Guy Ritchie" } },
    { _key: null, title: "Terminator", director: { name: "James Cameron" } },
  ] satisfies InferFromSchema<typeof schema>),
);

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as Mocked<Logger>;

beforeEach(() => {
  mockFn.mockRestore();
  logger.debug.mockRestore();
  logger.info.mockRestore();
  logger.warn.mockRestore();
  logger.error.mockRestore();
});

describe("makeSafeSanityFetch", () => {
  test("sends serialized query to fetch function", async () => {
    await makeQueryClient(mockFn, { logger })(schema);

    expect(mockFn).toHaveBeenCalledTimes(1);

    expect(mockFn).toHaveBeenCalledWith(
      `*[_type == "movie"]{_key,...@{title,director{name}}}`,
      undefined,
    );
  });

  test("sends params to fetch function", async () => {
    await makeQueryClient(mockFn, { logger })(schema, { foo: "bar" });

    expect(mockFn).toHaveBeenCalledTimes(1);

    expect(mockFn).toHaveBeenCalledWith(
      `*[_type == "movie"]{_key,...@{title,director{name}}}`,
      { foo: "bar" },
    );
  });

  test("throws validation error when response does not match schema", async () => {
    // @ts-expect-error
    mockFn.mockResolvedValueOnce([{ _type: "none" }]);

    await expect(() =>
      makeQueryClient(mockFn, { logger })(schema),
    ).rejects.toThrow("GROQ response did not match expected schema.");
  });

  test("logs warning when validation mode is WARN", async () => {
    // @ts-expect-error
    mockFn.mockResolvedValueOnce([{ _type: "none" }]);

    await makeQueryClient(mockFn, { logger, validationMode: "WARN" })(schema);

    expect(logger.warn).toHaveBeenCalledWith(
      {
        errors: [{ path: "", message: "Expected union value" }],
      },
      `GROQ response failed validation ("WARN" mode).`,
    );
  });

  test("does not log when validation mode is SILENT", async () => {
    // @ts-expect-error
    mockFn.mockResolvedValueOnce([{ _type: "none" }]);

    await makeQueryClient(mockFn, { logger, validationMode: "SILENT" })(schema);

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  test("throws error when no groq returned from schema", async () => {
    await expect(() =>
      makeQueryClient(mockFn, { logger })(Type.String()),
    ).rejects.toThrow(
      "The provided schema does not have a GROQ string. Check that you have used an appropriate schema.",
    );
  });
});
