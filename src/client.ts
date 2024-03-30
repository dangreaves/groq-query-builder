import { Type } from "@sinclair/typebox";
import { Value, TransformDecodeCheckError } from "@sinclair/typebox/value";

import type { BaseQuery } from "./query";
import type { InferFromQuery } from "./types";

export function makeSafeSanityFetch(
  fn: (query: string, params?: Record<string, string>) => Promise<any>,
) {
  return async function fetchSanity<T extends BaseQuery<any>>(
    query: T,
    params?: Record<string, string>,
  ): Promise<InferFromQuery<T>> {
    // Serialize the query to a GROQ string.
    const groq = query.serialize();

    // Sanity may return null, wrap the query schema in a union.
    const resultSchema = Type.Union([query.resolveSchema(), Type.Null()]);

    // Fetch result from Sanity.
    const res = params ? await fn(groq, params) : await fn(groq);

    // Validate the result against the schema.
    try {
      return Value.Decode(resultSchema, res);
    } catch (e) {
      if (e instanceof TransformDecodeCheckError) {
        throw new GroqValidationError(e);
      }

      throw e;
    }
  };
}

class GroqValidationError extends Error {
  constructor(readonly validationError: TransformDecodeCheckError) {
    super("GROQ response did not match expected schema.");
  }
}
