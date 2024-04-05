import type { Static, TSchema } from "@sinclair/typebox";

/**
 * Infer type from the given schema.
 */
export type InferFromSchema<T extends TSchema> = Static<T>;

/**
 * Options for schema expansion.
 */
export type TExpansionOption = boolean | string | undefined;
