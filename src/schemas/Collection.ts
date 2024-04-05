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

import type { TSerializer } from "../types";

import { Nullable, TNullable } from "./Nullable";

/**
 * Options available when creating a collection.
 */
export type TCollectionOptions = { filter?: string; slice?: [number, number] };

/**
 * Fetch an array of items with optional filter and slicing.
 */
// @ts-ignore Type instantiation is excessively deep and possibly infinite
export type TCollection<T extends TSchema = TSchema> = TArray<
  T extends TObject | TUnion
    ? TIntersect<[T, TObject<{ _key: TNullable<TString> }>]>
    : T
> & {
  __options__?: TCollectionOptions;
  __inner_schema__: T;
  serialize: TSerializer;
  filter: (filter: string) => TCollection<T>;
  slice: (slice: [number, number]) => TCollection<T>;
};

/**
 * Serialize a collection.
 */
function serializeCollection(schema: TCollection) {
  const { filter: _filter, slice } = schema.__options__ ?? {};

  // Trim filter star if provided. This is handled by the client.
  const filter =
    _filter && _filter.startsWith("*") ? _filter.substring(1) : _filter;

  const groq: string[] = [];

  // Append filter if provided.
  if (filter) {
    // Allow raw filters which are already bracketed.
    if (filter.includes("[")) groq.push(filter);
    // Otherwise, wrap it in brackets.
    else groq.push(`[${filter}]`);
  }

  // Append slice if provided.
  if (slice) {
    groq.push(`[${slice[0]}...${slice[1]}]`);
  }

  // No filter or slice provided, append empty [] to force array.
  if (!filter && !slice) {
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
  const innerGroq = schema.__inner_schema__.serialize?.();
  if (innerGroq) {
    if (
      TypeGuard.IsObject(schema.__inner_schema__) ||
      TypeGuard.IsUnion(schema.__inner_schema__)
    ) {
      groq.push(`{_key,...@${innerGroq}}`);
    } else groq.push(innerGroq);
  }

  return groq.join("");
}

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
  _schema: T,
  options?: TCollectionOptions,
): TCollection<T> {
  const arrayMemberSchema = TypeGuard.IsObject(_schema)
    ? Type.Intersect([_schema, Type.Object({ _key: Nullable(Type.String()) })])
    : _schema;

  // @ts-ignore TypeScript complains about type depth. Just trust me :(
  const schema = Type.Array(arrayMemberSchema) as TCollection<T>;

  schema.__inner_schema__ = _schema;

  if (options) {
    schema.__options__ = options;
  }

  schema.slice = (...args) => sliceCollection(schema, ...args);
  schema.filter = (...args) => filterCollection(schema, ...args);
  schema.serialize = (...args) => serializeCollection(schema, ...args);

  return schema;
}
