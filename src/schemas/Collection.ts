import {
  Type,
  TArray,
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
export type TCollection<T extends TSchema = TSchema> = TArray<
  T extends TObject ? TIntersect<[T, TObject<{ _key: TNullable<TString> }>]> : T
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
function serialize(this: TCollection) {
  const { filter: _filter, slice } = this.__options__ ?? {};

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
   * Prepend projection with outer key attribute if array contains object.
   *
   * This spread syntax means we never have to change this formatting based on what is inside
   * the child projection. The _key will always be on the "outside", regardless of if the
   * inner projection is expanded or not.
   *
   * @see https://www.sanity.io/answers/is-there-a-way-to-get-the-key-in-an-array-p1599730869291100
   */
  if (TypeGuard.IsObject(this.__inner_schema__)) {
    groq.push(`{_key,...@${this.__inner_schema__.serialize?.() ?? ""}}`);
  }

  return groq.join("");
}

/**
 * Filter a collection.
 */
function filter<T extends TCollection>(this: T, _filter: string): T {
  const clonedSchema = Object.assign({}, this) as T;

  clonedSchema.__options__ = {
    ...(clonedSchema.__options__ ?? {}),
    filter: _filter,
  };

  clonedSchema.slice = slice.bind(clonedSchema);
  clonedSchema.filter = filter.bind(clonedSchema);
  clonedSchema.serialize = serialize.bind(clonedSchema);

  return clonedSchema;
}

/**
 * Slice a collection.
 */
function slice<T extends TCollection>(this: T, _slice: [number, number]): T {
  const clonedSchema = Object.assign({}, this) as T;

  clonedSchema.__options__ = {
    ...(clonedSchema.__options__ ?? {}),
    slice: _slice,
  };

  clonedSchema.slice = slice.bind(clonedSchema);
  clonedSchema.filter = filter.bind(clonedSchema);
  clonedSchema.serialize = serialize.bind(clonedSchema);

  return clonedSchema;
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

  // @ts-ignore TypeScript complains about type depth. Just trust me :(
  const arraySchema = Type.Array(arrayMemberSchema) as TCollection<T>;

  arraySchema.__inner_schema__ = schema;

  if (options) {
    arraySchema.__options__ = options;
  }

  arraySchema.serialize = serialize.bind(arraySchema);

  // @ts-expect-error
  arraySchema.filter = filter.bind(arraySchema);

  // @ts-expect-error
  arraySchema.slice = slice.bind(arraySchema);

  return arraySchema;
}
