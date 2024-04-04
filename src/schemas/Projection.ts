import { Type, TObject, TProperties } from "@sinclair/typebox";

/**
 * Options available when creating a projection.
 */
export type TProjectionOptions =
  | {
      slice?: number;
      filter?: string;
      expandReference?: boolean | string | undefined;
    }
  | undefined;

/**
 * Symbol for storing options on schema without conflicting with JSON schema.
 */
const optionsKey = Symbol("options");

/**
 * Fetch a single object projection.
 */
export type TProjection<T extends TProperties = TProperties> = TObject<T> & {
  [optionsKey]?: TProjectionOptions;
  expand: (expandReference?: string) => TProjection<T>;
  filter: (filter: string) => TProjection<T>;
  slice: (slice: number) => TProjection<T>;
};

/**
 * Fetch a single object projection.
 */
export function Projection<T extends TProperties = TProperties>(
  properties: T,
  options?: TProjectionOptions,
): TProjection<T> {
  const { slice, filter, expandReference } = options ?? {};

  let groq = "";

  // Append filter if provided.
  if (filter) {
    groq += `[${filter}]`;
  }

  // Append slice if provided, or default 0 if filter provided.
  if (filter || "undefined" !== typeof slice) {
    groq += `[${slice ?? 0}]`;
  }

  // Calculate array of properties and join them into a projection.
  const projection = Object.entries(properties)
    .map(([key, value]) => {
      // Property has it's own GROQ to project.
      if (value.groq) {
        // If object projection, use an unquoted key.
        if (value.groq.startsWith("{") || value.groq.startsWith("["))
          return `${key}${value.groq}`;

        // If something else, use a quoted key.
        return `"${key}":${value.groq}`;
      }

      // If no groq, then use a naked key.
      return key;
    })
    .join(",");

  // Wrap in a reference expansion.
  if (true === expandReference) {
    groq += `{...@->{${projection}}}`;
  }

  // Wrap in a conditional reference expansion.
  else if ("string" === typeof expandReference) {
    groq += `{_type == "${expandReference}" => @->{${projection}},_type != "${expandReference}" => @{${projection}}}`;
  }

  // Append the unwrapped projection.
  else {
    groq += `{${projection}}`;
  }

  // Create object schema.
  const schema = Type.Object(properties, { groq }) as TProjection<T>;
  if (options) schema[optionsKey] = options;

  /**
   * Create a copy of this schema with expansion enabled.
   */
  schema.expand = (expandReference?: string) => {
    return Projection(properties, {
      ...options,
      expandReference: expandReference ?? true,
    });
  };

  /**
   * Create a copy of this schema with a filter.
   */
  schema.filter = (filter) => {
    return Projection(properties, {
      ...options,
      filter,
    });
  };

  /**
   * Create a copy of this schema with a slice.
   */
  schema.slice = (slice) => {
    return Projection(properties, {
      ...options,
      slice,
    });
  };

  return schema;
}
