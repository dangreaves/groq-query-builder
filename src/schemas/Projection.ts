import { Type, TObject, TProperties, TypeGuard } from "@sinclair/typebox";

import type { TExpansionOption } from "../types";

import { serialize } from "../serialize";

/**
 * Options available when creating a projection.
 */
export type TProjectionOptions = {
  slice?: number;
  filter?: string;
  expand?: TExpansionOption;
};

/**
 * Symbols for additional attributes on schema.
 */
const TypeAttribute = Symbol("type");
const SliceAttribute = Symbol("slice");
const FilterAttribute = Symbol("filter");
const ExpandAttribute = Symbol("expand");

/**
 * Additional attributes added to underlying schema.
 */
type AdditionalAttributes = {
  [TypeAttribute]: "Projection";
  [SliceAttribute]: TProjectionOptions["slice"];
  [FilterAttribute]: TProjectionOptions["filter"];
  [ExpandAttribute]: TProjectionOptions["expand"];
};

/**
 * Fetch a single object projection.
 */
export type TProjection<T extends TProperties = TProperties> = TObject<T> &
  AdditionalAttributes;

/**
 * Filter a projection.
 */
function filterProjection<T extends TProjection>(
  _schema: T,
  _filter: string,
): T {
  const { __options__, slice, expand, filter, serialize, ...rest } = _schema;

  const schema = rest as T;

  schema.__options__ = {
    ...__options__,
    filter: _filter,
  };

  schema.slice = (...args) => sliceProjection(schema, ...args);
  schema.expand = (...args) => expandProjection(schema, ...args);
  schema.filter = (...args) => filterProjection(schema, ...args);
  schema.serialize = (...args) => serializeProjection(schema, ...args);

  return schema;
}

/**
 * Slice a projection.
 */
function sliceProjection<T extends TProjection>(_schema: T, _slice: number): T {
  const { __options__, slice, expand, filter, serialize, ...rest } = _schema;

  const schema = rest as T;

  schema.__options__ = {
    ...__options__,
    slice: _slice,
  };

  schema.slice = (...args) => sliceProjection(schema, ...args);
  schema.expand = (...args) => expandProjection(schema, ...args);
  schema.filter = (...args) => filterProjection(schema, ...args);
  schema.serialize = (...args) => serializeProjection(schema, ...args);

  return schema;
}

/**
 * Expand a projection.
 */
function expandProjection<T extends TProjection>(
  _schema: T,
  expansionOption?: TExpansionOption,
): T {
  const { __options__, slice, expand, filter, serialize, ...rest } = _schema;

  const schema = rest as T;

  schema.__options__ = {
    ...__options__,
    expansionOption: expansionOption ?? true,
  };

  schema.slice = (...args) => sliceProjection(schema, ...args);
  schema.expand = (...args) => expandProjection(schema, ...args);
  schema.filter = (...args) => filterProjection(schema, ...args);
  schema.serialize = (...args) => serializeProjection(schema, ...args);

  return schema;
}

/**
 * Fetch a single object projection.
 */
export function Projection<T extends TProperties = TProperties>(
  properties: T,
  options?: TProjectionOptions,
): TProjection<T> {
  return Type.Object(properties, {
    [TypeAttribute]: "Projection",
    [SliceAttribute]: options?.slice,
    [FilterAttribute]: options?.filter,
    [ExpandAttribute]: options?.expand,
  } satisfies AdditionalAttributes) as TProjection<T>;
}

/**
 * Return true if the given value is a projection.
 */
export function isProjection(value: unknown): value is TProjection {
  return (
    TypeGuard.IsSchema(value) &&
    "Projection" === (value as TProjection)[TypeAttribute]
  );
}

/**
 * Serialize a projection.
 */
export function serializeProjection(schema: TProjection): string {
  // Trim filter star if provided. This is handled by the client.
  const filter = schema[FilterAttribute]?.startsWith("*")
    ? schema[FilterAttribute].substring(1)
    : schema[FilterAttribute];

  const groq: string[] = [];

  // Append filter if provided.
  if (filter) {
    // Allow raw filters which are already bracketed.
    if (filter.includes("[")) groq.push(filter);
    // Otherwise, wrap it in brackets.
    else groq.push(`[${filter}]`);
  }

  /**
   * Determine if a slice is already added via the filter.
   * The filter option supports "raw" filters where you might pass [foo == "bar"][0] which already
   * has a slice on the end. Therefore, we don't need to slice it further.
   */
  const alreadySliced = filter ? /\[\d+\]$/.test(filter) : false;

  // Append slice if provided, or default 0 if filter provided.
  if (
    !alreadySliced &&
    (filter || "undefined" !== typeof schema[SliceAttribute])
  ) {
    groq.push(`[${schema[SliceAttribute] ?? 0}]`);
  }

  // Calculate array of properties and join them into a projection.
  const projection = Object.entries(schema.properties)
    .map(([key, value]) => {
      // Serialize GROQ for this property.
      const innerGroq = serialize(value);

      // Property has it's own GROQ to project.
      if (innerGroq) {
        // If object projection, use an unquoted key.
        if (innerGroq.startsWith("{") || innerGroq.startsWith("["))
          return `${key}${innerGroq}`;

        // If something else, use a quoted key.
        return `"${key}":${innerGroq}`;
      }

      // If no groq, then use a naked key.
      return key;
    })
    .join(",");

  // Wrap in a reference expansion.
  if (true === schema[ExpandAttribute]) {
    groq.push(`{...@->{${projection}}}`);
  }

  // Wrap in a conditional reference expansion.
  else if ("string" === typeof schema[ExpandAttribute]) {
    groq.push(
      `{_type == "${schema[ExpandAttribute]}" => @->{${projection}},_type != "${schema[ExpandAttribute]}" => @{${projection}}}`,
    );
  }

  // Append the unwrapped projection.
  else {
    groq.push(`{${projection}}`);
  }

  return groq.join("");
}
