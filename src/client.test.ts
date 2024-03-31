import type { Logger } from "pino";
import { vi, expect, test, describe, beforeEach, Mocked } from "vitest";

import { filterByType } from "./query";
import type { InferFromQuery } from "./types";

import { makeSafeSanityFetch } from "./client";

import * as Schemas from "./schemas";

const query = filterByType("movie").grab(
  Schemas.Object({
    title: Schemas.String(),
    director: Schemas.Object({
      name: Schemas.String(),
    }),
  }),
);

const mockFn = vi.fn(() =>
  Promise.resolve([
    { title: "Snatch", director: { name: "Guy Ritchie" } },
    { title: "Terminator", director: { name: "James Cameron" } },
  ] satisfies InferFromQuery<typeof query>),
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
    await makeSafeSanityFetch(mockFn, { logger })(query);

    expect(mockFn).toHaveBeenCalledTimes(1);

    expect(mockFn).toHaveBeenCalledWith(
      `*[_type == "movie"][]{title,director{name}}`,
    );
  });

  test("sends params to fetch function", async () => {
    await makeSafeSanityFetch(mockFn, { logger })(query, { foo: "bar" });

    expect(mockFn).toHaveBeenCalledTimes(1);

    expect(mockFn).toHaveBeenCalledWith(
      `*[_type == "movie"][]{title,director{name}}`,
      { foo: "bar" },
    );
  });

  test("throws validation error when response does not match schema", async () => {
    // @ts-expect-error
    mockFn.mockResolvedValueOnce([{ _type: "none" }]);

    await expect(() =>
      makeSafeSanityFetch(mockFn, { logger })(query),
    ).rejects.toThrow("GROQ response did not match expected schema.");
  });

  test("logs warning when validation mode is WARN", async () => {
    // @ts-expect-error
    mockFn.mockResolvedValueOnce([{ _type: "none" }]);

    await makeSafeSanityFetch(mockFn, { logger, validationMode: "WARN" })(
      query,
    );

    expect(logger.warn).toHaveBeenCalledWith(
      {
        errors: [{ path: "", message: "Expected union value" }],
      },
      `GROQ response failed validation ("WARN" mode).`,
    );
  });
});
