import type { Static, TSchema } from "@sinclair/typebox";

/**
 * Attach symbols to schema interface.
 */
declare module "@sinclair/typebox" {
  interface TSchema {
    serialize?: TSerializer;
  }
}

/**
 * Serialize schema to GROQ string.
 */
export type TSerializer = (this: TSchema) => string;

/**
 * Infer type from the given schema.
 */
export type InferFromSchema<T extends TSchema> = Static<T>;

/**
 * Options for schema expansion.
 */
export type TExpansionOption = boolean | string | undefined;
