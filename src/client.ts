import { pino, type Logger } from "pino";

import { Type } from "@sinclair/typebox";
import { Value, type ValueError } from "@sinclair/typebox/value";

import type { BaseQuery } from "./query";
import type { InferFromQuery } from "./types";

export function makeSafeSanityFetch(
  fn: (query: string, params?: Record<string, string>) => Promise<any>,
  {
    logger = pino(),
    validationMode = "ERROR",
  }: { logger?: Logger; validationMode?: "ERROR" | "WARN" } = {},
) {
  return async function fetchSanity<T extends BaseQuery<any>>(
    query: T,
    params?: Record<string, string>,
  ): Promise<InferFromQuery<T>> {
    // Serialize the query to a GROQ string.
    const groq = query.serialize();

    // Log the GROQ query.
    logger.info({ query: groq }, "Sending GROQ query.");

    // Sanity may return null, wrap the query schema in a union.
    const resultSchema = Type.Union([query.resolveSchema(), Type.Null()]);

    // Fetch result from Sanity.
    const res = params ? await fn(groq, params) : await fn(groq);

    // Log the GROQ response.
    logger.info({ res }, "Received GROQ response.");

    // Converted result.
    const result = Value.Convert(resultSchema, res);

    // Check against schema.
    const isValid = Value.Check(resultSchema, result);

    // Schema is not valid.
    if (!isValid) {
      // Calculate validation errors.
      const _errors = [...Value.Errors(resultSchema, result)];

      // Format errors in a clean way (default includes entire schema).
      const errors = _errors.map(({ message, path }) => ({
        path,
        message,
      }));

      // Validation mode is "ERROR", throw an exception.
      if ("ERROR" === validationMode) {
        logger.error(
          { errors },
          `GROQ response failed validation ("ERROR" mode).`,
        );

        throw new GroqValidationError(errors);
      }

      // Validation mode is "WARN", log a warning.
      if ("WARN" === validationMode) {
        logger.warn(
          { errors },
          `GROQ response failed validation ("WARN" mode).`,
        );
      }
    }

    // Return result.
    return result as InferFromQuery<T>;
  };
}

class GroqValidationError extends Error {
  constructor(readonly errors: Pick<ValueError, "path" | "message">[]) {
    super("GROQ response did not match expected schema.");
  }
}
