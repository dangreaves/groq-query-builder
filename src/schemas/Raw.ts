import { TSchema, TypeGuard } from "@sinclair/typebox";

import { TypeSymbol, GroqSymbol } from "../symbols";

/**
 * Additional attributes added to underlying schema.
 */
type AdditionalAttributes = {
  [TypeSymbol]: "Raw";
  [GroqSymbol]: string;
};

/**
 * Output raw GROQ.
 */
export type TRaw<T extends TSchema = TSchema> = T & AdditionalAttributes;

/**
 * Output raw GROQ.
 */
export function Raw<T extends TSchema = TSchema>(
  groq: string,
  schema: T,
): TRaw<T> {
  return {
    ...schema,
    [TypeSymbol]: "Raw",
    [GroqSymbol]: groq,
  } satisfies AdditionalAttributes;
}

/**
 * Return true if the given value is a raw.
 */
export function isRaw(value: unknown): value is TRaw {
  return TypeGuard.IsSchema(value) && "Raw" === (value as TRaw)[TypeSymbol];
}

/**
 * Serialize a projection.
 */
export function serializeRaw(schema: TRaw): string {
  return schema[GroqSymbol];
}
