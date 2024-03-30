import { vi, expect, test, describe, beforeEach } from "vitest";

import { filterByType } from "./query";
import type { InferFromQuery } from "./types";
import { makeSafeSanityFetch } from "./client";

import * as Schemas from "./schemas";

const query = filterByType("movie").grab(
  Schemas.Projection({
    title: Schemas.String(),
    director: Schemas.Projection({
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

beforeEach(() => {
  mockFn.mockRestore();
});

describe("makeSafeSanityFetch", () => {
  test("sends serialized query to fetch function", async () => {
    await makeSafeSanityFetch(mockFn)(query);

    expect(mockFn).toHaveBeenCalledTimes(1);

    expect(mockFn).toHaveBeenCalledWith(
      `*[_type == "movie"][]{title,director{name}}`,
    );
  });

  test("sends params to fetch function", async () => {
    await makeSafeSanityFetch(mockFn)(query, { foo: "bar" });

    expect(mockFn).toHaveBeenCalledTimes(1);

    expect(mockFn).toHaveBeenCalledWith(
      `*[_type == "movie"][]{title,director{name}}`,
      { foo: "bar" },
    );
  });

  test("throws validation error when response does not match schema", async () => {
    // @ts-expect-error
    mockFn.mockResolvedValueOnce([{ _type: "none" }]);

    await expect(() => makeSafeSanityFetch(mockFn)(query)).rejects.toThrowError(
      "GROQ response did not match expected schema.",
    );
  });
});
