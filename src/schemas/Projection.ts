import { Type, TObject, TProperties } from "@sinclair/typebox";

import type { TSerializer, TExpansionOption } from "../types";

/**
 * Options available when creating a projection.
 */
export type TProjectionOptions = {
  slice?: number;
  filter?: string;
  expansionOption?: TExpansionOption;
};

/**
 * Fetch a single object projection.
 */
export type TProjection<T extends TProperties = TProperties> = TObject<T> & {
  __options__?: TProjectionOptions;
  serialize: TSerializer;
  slice: (slice: number) => TProjection<T>;
  filter: (filter: string) => TProjection<T>;
  expand: (option?: TExpansionOption) => TProjection<T>;
};

/**
 * Serialize a projection.
 */
function serializeProjection(schema: TProjection) {
  const { slice, filter: _filter, expansionOption } = schema.__options__ ?? {};

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

  /**
   * Determine if a slice is already added via the filter.
   * The filter option supports "raw" filters where you might pass [foo == "bar"][0] which already
   * has a slice on the end. Therefore, we don't need to slice it further.
   */
  const alreadySliced = filter ? /\[\d+\]$/.test(filter) : false;

  // Append slice if provided, or default 0 if filter provided.
  if (!alreadySliced && (filter || "undefined" !== typeof slice)) {
    groq.push(`[${slice ?? 0}]`);
  }

  // Calculate array of properties and join them into a projection.
  const projection = Object.entries(schema.properties)
    .map(([key, value]) => {
      // Serialize GROQ for this property.
      const innerGroq = value.serialize?.();

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
  if (true === expansionOption) {
    groq.push(`{...@->{${projection}}}`);
  }

  // Wrap in a conditional reference expansion.
  else if ("string" === typeof expansionOption) {
    groq.push(
      `{_type == "${expansionOption}" => @->{${projection}},_type != "${expansionOption}" => @{${projection}}}`,
    );
  }

  // Append the unwrapped projection.
  else {
    groq.push(`{${projection}}`);
  }

  return groq.join("");
}

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
  const schema = Type.Object(properties) as TProjection<T>;

  if (options) {
    schema.__options__ = options;
  }

  schema.slice = (...args) => sliceProjection(schema, ...args);
  schema.expand = (...args) => expandProjection(schema, ...args);
  schema.filter = (...args) => filterProjection(schema, ...args);
  schema.serialize = (...args) => serializeProjection(schema, ...args);

  return schema;
}
