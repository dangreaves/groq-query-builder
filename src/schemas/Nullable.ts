import { Type, TSchema, TUnion, TNull, TypeGuard } from "@sinclair/typebox";

import { serializeQuery } from "../serialize";

/**
 * Symbols for additional attributes on schema.
 */
const TypeAttribute = Symbol("type");
const InnerSchemaAttribute = Symbol("innerSchema");

/**
 * Additional attributes added to underlying schema.
 */
type AdditionalAttributes = {
  [TypeAttribute]: "Nullable";
  [InnerSchemaAttribute]: TSchema;
};

/**
 * Allow the given schema to be null.
 */
export type TNullable<T extends TSchema = TSchema> = TUnion<[T, TNull]> &
  AdditionalAttributes;

/**
 * Allow the given schema to be null.
 */
export function Nullable<T extends TSchema>(schema: T): TNullable<T> {
  return Type.Union([schema, Type.Null()], {
    [TypeAttribute]: "Nullable",
    [InnerSchemaAttribute]: schema,
  } satisfies AdditionalAttributes) as TNullable<T>;
}

/**
 * Return true if the given value is a nullable.
 */
export function isNullable(value: unknown): value is TNullable {
  return (
    TypeGuard.IsSchema(value) &&
    "Nullable" === (value as TNullable)[TypeAttribute]
  );
}

/**
 * Serialize a nullable.
 */
export function serializeNullable(schema: TNullable): string {
  return serializeQuery(schema[InnerSchemaAttribute]);
}
