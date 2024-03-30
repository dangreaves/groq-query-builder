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
    const groq = query.serialize();

    const res = params ? await fn(groq, params) : await fn(groq);

    try {
      return Value.Decode(query.resolveSchema(), res);
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
