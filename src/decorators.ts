import { Type, TypeGuard } from "@sinclair/typebox";

import type {
  TUnion,
  TSchema,
  TString,
  TObject,
  TIntersect,
} from "@sinclair/typebox";

/**
 * Prepend the _key attribute to the given object schema.
 */
export type TWithKey<T extends TSchema> = T extends TUnion
  ? TIntersect<[T, TObject<{ _key: TString }>]>
  : T extends TObject
    ? TIntersect<[T, TObject<{ _key: TString }>]>
    : T;

/**
 * Prepend the _key attribute to the given object or union schema.
 */
export function decorateKey<T extends TSchema>(schema: T): TWithKey<T> {
  if (!TypeGuard.IsObject(schema) && !TypeGuard.IsUnion(schema)) {
    return schema as TWithKey<T>;
  }

  return Type.Intersect([
    schema,
    Type.Object({ _key: Type.String() }),
  ]) as TWithKey<T>;
}
