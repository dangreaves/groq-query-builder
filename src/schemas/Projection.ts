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
  expand: (this: any, option?: TExpansionOption) => TProjection<T>;
};

/**
 * Serialize a projection.
 */
function serialize(this: TProjection) {
  const { slice, filter, expansionOption } = this.__options__ ?? {};

  const groq: string[] = [];

  // Append filter if provided.
  if (filter) {
    groq.push(`[${filter}]`);
  }

  // Append slice if provided, or default 0 if filter provided.
  if (filter || "undefined" !== typeof slice) {
    groq.push(`[${slice ?? 0}]`);
  }

  // Calculate array of properties and join them into a projection.
  const projection = Object.entries(this.properties)
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
function filter<T extends TProjection>(this: T, _filter: string): T {
  const clonedSchema = Object.assign({}, this) as T;

  clonedSchema.__options__ = {
    ...(clonedSchema.__options__ ?? {}),
    filter: _filter,
  };

  clonedSchema.slice = slice.bind(clonedSchema);
  clonedSchema.filter = filter.bind(clonedSchema);
  clonedSchema.expand = expand.bind(clonedSchema);
  clonedSchema.serialize = serialize.bind(clonedSchema);

  return clonedSchema;
}

/**
 * Slice a projection.
 */
function slice<T extends TProjection>(this: T, _slice: number): T {
  const clonedSchema = Object.assign({}, this) as T;

  clonedSchema.__options__ = {
    ...(clonedSchema.__options__ ?? {}),
    slice: _slice,
  };

  clonedSchema.slice = slice.bind(clonedSchema);
  clonedSchema.filter = filter.bind(clonedSchema);
  clonedSchema.expand = expand.bind(clonedSchema);
  clonedSchema.serialize = serialize.bind(clonedSchema);

  return clonedSchema;
}

/**
 * Expand a projection.
 */
function expand<T extends TProjection>(
  this: T,
  expansionOption?: TExpansionOption,
): T {
  const clonedSchema = Object.assign({}, this) as T;

  clonedSchema.__options__ = {
    ...(clonedSchema.__options__ ?? {}),
    expansionOption: expansionOption ?? true,
  };

  clonedSchema.slice = slice.bind(clonedSchema);
  clonedSchema.filter = filter.bind(clonedSchema);
  clonedSchema.expand = expand.bind(clonedSchema);
  clonedSchema.serialize = serialize.bind(clonedSchema);

  return clonedSchema;
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

  // @ts-expect-error
  schema.slice = slice.bind(schema);
  // @ts-expect-error
  schema.filter = filter.bind(schema);
  // @ts-expect-error
  schema.expand = expand.bind(schema);
  schema.serialize = serialize.bind(schema);

  return schema;
}
