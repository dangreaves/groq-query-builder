import type { Static, TSchema } from "@sinclair/typebox";

/**
 * Infer type from the given schema.
 */
export type InferFromSchema<T extends TSchema> = Static<T>;
