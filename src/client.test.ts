import type { Logger } from "pino";
import { vi, expect, test, describe, beforeEach, Mocked } from "vitest";

import type { InferFromSchema } from "./types";

import { makeSafeSanityFetch } from "./client";

import * as S from "./schemas";

const schema = S.Collection(
  S.Projection({
    title: S.String(),
    director: S.Projection({
      name: S.String(),
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
    await makeSafeSanityFetch(mockFn, { logger })(schema);

    expect(mockFn).toHaveBeenCalledTimes(1);

    expect(mockFn).toHaveBeenCalledWith(
      `*[_type == "movie"]{_key,...@{title,director{name}}}`,
      undefined,
    );
  });

  test("sends params to fetch function", async () => {
    await makeSafeSanityFetch(mockFn, { logger })(schema, { foo: "bar" });

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
      makeSafeSanityFetch(mockFn, { logger })(schema),
    ).rejects.toThrow("GROQ response did not match expected schema.");
  });

  test("logs warning when validation mode is WARN", async () => {
    // @ts-expect-error
    mockFn.mockResolvedValueOnce([{ _type: "none" }]);

    await makeSafeSanityFetch(mockFn, { logger, validationMode: "WARN" })(
      schema,
    );

    expect(logger.warn).toHaveBeenCalledWith(
      {
        errors: [{ path: "", message: "Expected union value" }],
      },
      `GROQ response failed validation ("WARN" mode).`,
    );
  });
});
