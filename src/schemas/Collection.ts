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

import { serialize } from "../serialize";

/**
 * Options available when creating a collection.
 */
type TCollectionOptions = { filter?: string; slice?: [number, number] };

/**
 * Symbols for additional attributes on schema.
 */
const TypeAttribute = Symbol("type");
const SliceAttribute = Symbol("slice");
const FilterAttribute = Symbol("filter");
const InnerSchemaAttribute = Symbol("innerSchema");

/**
 * Additional attributes added to underlying schema.
 */
type AdditionalAttributes = {
  [TypeAttribute]: "Collection";
  [InnerSchemaAttribute]: TSchema;
  [SliceAttribute]: TCollectionOptions["slice"];
  [FilterAttribute]: TCollectionOptions["filter"];
};

/**
 * Fetch an array of items with optional filter and slicing.
 */
export type TCollection<T extends TSchema = TSchema> = TArray<
  T extends TObject | TUnion
    ? TIntersect<[T, TObject<{ _key: TNullable<TString> }>]>
    : T
> &
  AdditionalAttributes;

/**
 * Filter a collection.
 */
function filterCollection<T extends TCollection>(
  _schema: T,
  _filter: string,
): T {
  const { __options__, slice, expand, filter, serialize, ...rest } = _schema;

  const schema = rest as T;

  schema.__options__ = {
    ...__options__,
    filter: _filter,
  };

  schema.slice = (...args) => sliceCollection(schema, ...args);
  schema.filter = (...args) => filterCollection(schema, ...args);
  schema.serialize = (...args) => serializeCollection(schema, ...args);

  return schema;
}

/**
 * Slice a collection.
 */
function sliceCollection<T extends TCollection>(
  _schema: T,
  _slice: [number, number],
): T {
  const { __options__, slice, expand, filter, serialize, ...rest } = _schema;

  const schema = rest as T;

  schema.__options__ = {
    ...__options__,
    slice: _slice,
  };

  schema.slice = (...args) => sliceCollection(schema, ...args);
  schema.filter = (...args) => filterCollection(schema, ...args);
  schema.serialize = (...args) => serializeCollection(schema, ...args);

  return schema;
}

/**
 * Fetch an array of items with optional filter and slicing.
 */
export function Collection<T extends TSchema = TSchema>(
  schema: T,
  options?: TCollectionOptions,
): TCollection<T> {
  const arrayMemberSchema = TypeGuard.IsObject(schema)
    ? Type.Intersect([schema, Type.Object({ _key: Nullable(Type.String()) })])
    : schema;

  return Type.Array(arrayMemberSchema, {
    [TypeAttribute]: "Collection",
    [InnerSchemaAttribute]: schema,
    [SliceAttribute]: options?.slice,
    [FilterAttribute]: options?.filter,
  } satisfies AdditionalAttributes) as TCollection<T>;
}

/**
 * Return true if the given value is a collection.
 */
export function isCollection(value: unknown): value is TCollection {
  return (
    TypeGuard.IsSchema(value) &&
    "Collection" === (value as TCollection)[TypeAttribute]
  );
}

/**
 * Serialize a collection.
 */
export function serializeCollection(schema: TCollection): string {
  // Trim filter star if provided. This is handled by the client.
  const filter = schema[FilterAttribute]?.startsWith("*")
    ? schema[FilterAttribute].substring(1)
    : schema[FilterAttribute];

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
  if (schema[SliceAttribute]) {
    groq.push(`[${schema[SliceAttribute][0]}...${schema[SliceAttribute][1]}]`);
  }

  // No filter or slice provided, append empty [] to force array.
  if (!filter && !schema[SliceAttribute]) {
    groq.push("[]");
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
  const innerGroq = serialize(schema[InnerSchemaAttribute]);
  if (innerGroq) {
    if (
      TypeGuard.IsObject(schema[InnerSchemaAttribute]) ||
      TypeGuard.IsUnion(schema[InnerSchemaAttribute])
    ) {
      groq.push(`{_key,...@${innerGroq}}`);
    } else groq.push(innerGroq);
  }

  return groq.join("");
}
