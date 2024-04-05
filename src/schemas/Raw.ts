import { TSchema, TypeGuard } from "@sinclair/typebox";

/**
 * Symbols for additional attributes on schema.
 */
const TypeAttribute = Symbol("type");
const GroqAttribute = Symbol("groq");

/**
 * Additional attributes added to underlying schema.
 */
type AdditionalAttributes = {
  [TypeAttribute]: "Raw";
  [GroqAttribute]: string;
};

/**
 * Output raw GROQ.
 */
export type TRaw<T extends TSchema = TSchema> = T & AdditionalAttributes;

/**
 * Output raw GROQ.
 */
export function Raw<T extends TSchema = TSchema>(groq: string, schema: T) {
  return {
    ...schema,
    [TypeAttribute]: "Raw",
    [GroqAttribute]: groq,
  } satisfies AdditionalAttributes;
}

/**
 * Return true if the given value is a raw.
 */
export function isRaw(value: unknown): value is TRaw {
  return TypeGuard.IsSchema(value) && "Raw" === (value as TRaw)[TypeAttribute];
}

/**
 * Serialize a projection.
 */
export function serializeRaw(schema: TRaw): string {
  return schema[GroqAttribute];
}
