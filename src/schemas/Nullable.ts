import { Type, TSchema, TUnion, TNull } from "@sinclair/typebox";

/**
 * Allow the given schema to be null.
 */
export type TNullable<T extends TSchema = TSchema> = TUnion<[T, TNull]>;

/**
 * Allow the given schema to be null.
 */
export function Nullable<T extends TSchema>(schema: T): TNullable<T> {
  return Type.Union([schema, Type.Null()], {
    groq: schema.groq,
  });
}
