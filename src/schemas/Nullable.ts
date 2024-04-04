import { Type, TSchema, TUnion, TNull } from "@sinclair/typebox";

/**
 * Allow the given schema to be null.
 */
export type TNullable<T extends TSchema = TSchema> = TUnion<[T, TNull]>;

/**
 * Allow the given schema to be null.
 */
export function Nullable<T extends TSchema>(schema: T): TNullable<T> {
  const unionSchema = Type.Union([schema, Type.Null()]) as TNullable<T>;

  if (schema.serialize) {
    unionSchema.serialize = schema.serialize.bind(schema);
  }

  return unionSchema;
}
