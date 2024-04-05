import { pino, type Logger } from "pino";

import type { TSchema } from "@sinclair/typebox";
import { Value, type ValueError } from "@sinclair/typebox/value";

import { serialize } from "./serialize";

import type { InferFromSchema } from "./types";

import { Nullable, TNullable } from "./schemas/Nullable";

type SanityParams = Record<string, string | number | null> | undefined;

export function makeQueryClient(
  fn: (query: string, params?: SanityParams) => Promise<any>,
  {
    validationMode = "ERROR",
    logger = pino({ level: "info" }),
  }: { logger?: Logger; validationMode?: "ERROR" | "WARN" } = {},
) {
  return async function fetchSanity<T extends TSchema>(
    schema: T,
    params?: SanityParams,
  ): Promise<InferFromSchema<TNullable<T>>> {
    // Sanity may return null, wrap the query schema in a union.
    const resultSchema = Nullable(schema);

    // Serialize the query to a GROQ string.
    const groq = "*" + serialize(schema);

    // No groq stored on schema.
    if (!groq) {
      throw new Error(
        "The provided schema does not have a GROQ string. Check that you have used an appropriate schema.",
      );
    }

    // Log the GROQ query.
    logger.debug({ query: groq }, "Sending GROQ query.");

    // Fetch result from Sanity.
    const res = await fn(groq, params);

    // Log the GROQ response.
    logger.debug({ res }, "Received GROQ response.");

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
    return result as InferFromSchema<TNullable<T>>;
  };
}

class GroqValidationError extends Error {
  constructor(readonly errors: Pick<ValueError, "path" | "message">[]) {
    super("GROQ response did not match expected schema.");
  }
}
