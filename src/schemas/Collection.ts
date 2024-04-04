import {
  Type,
  TArray,
  TSchema,
  TObject,
  TString,
  TIntersect,
} from "@sinclair/typebox";

import type { TPrimitive } from "./types";

import { Nullable, TNullable } from "./Nullable";

/**
 * Options available when creating a collection.
 */
export type TCollectionOptions =
  | { filter?: string; slice?: [number, number] }
  | undefined;

/**
 * Symbols for storing options on schema without conflicting with JSON schema.
 */
const optionsKey = Symbol("options");
const originalInnerSchema = Symbol("originalInnerSchema");

/**
 * Additional attributes added to array schema.
 */
type AdditionalSchemaAttributes = {
  [optionsKey]?: TCollectionOptions;
  [originalInnerSchema]: TSchema;
};

/**
 * Fetch an array of items with optional filter and slicing.
 */
export type TCollection<T extends TSchema = TSchema> = T extends TPrimitive
  ? TArray<T> & AdditionalSchemaAttributes
  : TArray<TIntersect<[T, TObject<{ _key: TNullable<TString> }>]>> &
      AdditionalSchemaAttributes;

/**
 * Fetch an array of items with optional filter and slicing.
 */
export function Collection<T extends TSchema = TSchema>(
  schema: T,
  options?: TCollectionOptions,
): TCollection<T> {
  const { slice, filter } = options ?? {};

  let groq = "";

  // Append filter if provided.
  if (filter) {
    groq += `[${filter}]`;
  }

  // Append slice if provided.
  if (slice) {
    groq += `[${slice[0]}...${slice[1]}]`;
  }

  // No filter or slice provided, append empty [] to force array.
  if (!filter && !slice) {
    groq += "[]";
  }

  // Calculate an outer schema.
  const outerSchema = (() => {
    // There is no projection groq, return naked.
    if (!schema.groq) {
      return Type.Array(schema, { groq }) as TCollection<T>;
    }

    /**
     * Prepend projection with outer key attribute.
     *
     * This spread syntax means we never have to change this formatting based on what is inside
     * the child projection. The _key will always be on the "outside", regardless of if the
     * inner projection is expanded or not.
     *
     * @see https://www.sanity.io/answers/is-there-a-way-to-get-the-key-in-an-array-p1599730869291100
     */
    groq += `{_key,...@${schema.groq}}`;

    // Return an intersect schema such that _key is added to the return type.
    return Type.Array(
      Type.Intersect([schema, Type.Object({ _key: Nullable(Type.String()) })]),
      { groq },
    ) as TCollection<T>;
  })();

  // Attach additional attributes.
  outerSchema[optionsKey] = options;
  outerSchema[originalInnerSchema] = schema;

  return outerSchema;
}

/**
 * Apply a filter to the given collection.
 */
export function filterCollection<T extends TCollection>(
  schema: T,
  filter: string,
): T {
  return Collection(schema[originalInnerSchema], {
    ...schema[optionsKey],
    filter,
  }) as T;
}

/**
 * Apply a slice to the given collection.
 */
export function sliceCollection<T extends TCollection>(
  schema: T,
  slice: [number, number],
): T {
  return Collection(schema[originalInnerSchema], {
    ...schema[optionsKey],
    slice,
  }) as T;
}
