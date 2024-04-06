import {
  Type,
  TArray,
  TUnion,
  TSchema,
  TObject,
  TString,
  TIntersect,
  TypeGuard,
} from "@sinclair/typebox";

import { Nullable, TNullable } from "./Nullable";

import { cloneSchema } from "../clone";
import { serializeQuery } from "../serialize";

import {
  TypeSymbol,
  SliceSymbol,
  FilterSymbol,
  NeedsIntersectUnwrapSymbol,
} from "../symbols";

/**
 * Options available when creating a collection.
 */
type TCollectionOptions = { filter?: string; slice?: [number, number] };

/**
 * Additional attributes added to underlying schema.
 */
type AdditionalAttributes = {
  [TypeSymbol]: "Collection";
  [NeedsIntersectUnwrapSymbol]: boolean;
  [SliceSymbol]: TCollectionOptions["slice"];
  [FilterSymbol]: TCollectionOptions["filter"];
};

/**
 * Fetch an array of items with optional filter and slicing.
 */
// @ts-ignore Type instantiation is excessively deep and possibly infinite.
export type TCollection<T extends TSchema = TSchema> = TArray<
  T extends TObject | TUnion
    ? TIntersect<[T, TObject<{ _key: TNullable<TString> }>]>
    : T
> &
  AdditionalAttributes;

/**
 * Fetch an array of items with optional filter and slicing.
 */
export function Collection<T extends TSchema = TSchema>(
  schema: T,
  options?: TCollectionOptions,
): TCollection<T> {
  let arrayMemberSchema: TSchema = schema;
  let needsIntersectUnwrap: boolean = false;

  // If the inner schema is an object, add the _key attribute with an intersect.
  if (TypeGuard.IsObject(schema)) {
    arrayMemberSchema = Type.Intersect([
      schema,
      Type.Object({ _key: Nullable(Type.String()) }),
    ]);

    /**
     * Signals to the serializer that the array member schema needs to be unwrapped
     * to find the "real" schema within.
     */
    needsIntersectUnwrap = true;
  }

  // @ts-ignore Type instantiation is excessively deep and possibly infinite.
  return Type.Array(arrayMemberSchema, {
    [TypeSymbol]: "Collection",
    [SliceSymbol]: options?.slice,
    [FilterSymbol]: options?.filter,
    [NeedsIntersectUnwrapSymbol]: needsIntersectUnwrap,
  } satisfies AdditionalAttributes) as TCollection<T>;
}

/**
 * Return true if the given value is a collection.
 */
export function isCollection(value: unknown): value is TCollection {
  return (
    TypeGuard.IsSchema(value) &&
    "Collection" === (value as TCollection)[TypeSymbol]
  );
}

/**
 * Serialize a collection.
 */
export function serializeCollection(schema: TCollection): string {
  // Trim filter star if provided. This is handled by the client.
  const filter = schema[FilterSymbol]?.startsWith("*")
    ? schema[FilterSymbol].substring(1)
    : schema[FilterSymbol];

  // Start the GROQ string.
  const groq: string[] = [];

  // Append filter if provided.
  if (filter) {
    // Allow raw filters which are already bracketed.
    if (filter.includes("[")) groq.push(filter);
    // Otherwise, wrap it in brackets.
    else groq.push(`[${filter}]`);
  }

  // Append slice if provided.
  if (schema[SliceSymbol]) {
    groq.push(`[${schema[SliceSymbol][0]}...${schema[SliceSymbol][1]}]`);
  }

  // No filter or slice provided, append empty [] to force array.
  if (!filter && !schema[SliceSymbol]) {
    groq.push("[]");
  }

  // Set inner schema to the array member.
  let innerSchema: TSchema = schema.items;

  /**
   * If the schema needs "unwrapping", then the array member will be an intersect
   * to add the _key attribute. We need to go get the actual schema from within
   * the intersect to be able to serialize it.
   */
  if (schema[NeedsIntersectUnwrapSymbol]) {
    innerSchema = (schema.items as TIntersect).allOf[0]!;
  }

  /**
   * Prepend projection with outer key attribute if this is an object like schema.
   *
   * This spread syntax means we never have to change this formatting based on what is inside
   * the child projection. The _key will always be on the "outside", regardless of if the
   * inner projection is expanded or not.
   *
   * @see https://www.sanity.io/answers/is-there-a-way-to-get-the-key-in-an-array-p1599730869291100
   */
  const innerGroq = serializeQuery(innerSchema);
  if (innerGroq) {
    if (TypeGuard.IsObject(innerSchema) || TypeGuard.IsUnion(innerSchema)) {
      groq.push(`{_key,...@${innerGroq}}`);
    } else groq.push(innerGroq);
  }

  return groq.join("");
}

/**
 * Filter a collection.
 */
export function filterCollection<T extends TCollection>(
  schema: T,
  filter: string,
): T {
  return cloneSchema(schema, {
    [FilterSymbol]: filter,
  } satisfies Partial<AdditionalAttributes>);
}

/**
 * Slice a collection.
 */
export function sliceCollection<T extends TCollection>(
  schema: T,
  slice: [number, number],
): T {
  return cloneSchema(schema, {
    [SliceSymbol]: slice,
  } satisfies Partial<AdditionalAttributes>);
}
