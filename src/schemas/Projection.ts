import { Type, TObject, TProperties, TypeGuard } from "@sinclair/typebox";

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
 * Symbols for storing options on schema without conflicting with JSON schema.
 */
const optionsKey = Symbol("options");
const originalPropertiesKey = Symbol("originalProperties");

/**
 * Fetch a single object projection.
 */
export type TProjection<T extends TProperties = TProperties> = TObject<T> & {
  groqType: "projection";
  [optionsKey]?: TProjectionOptions;
  [originalPropertiesKey]: T;
};

/**
 * Fetch a single object projection.
 */
export function Projection<T extends TProperties = TProperties>(
  properties: T,
  options?: TProjectionOptions,
): TProjection<T> {
  const { slice, filter, expandReference } = options ?? {};

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
    groq.push(`{...@->{${projection}}}`);
  }

  // Wrap in a conditional reference expansion.
  else if ("string" === typeof expandReference) {
    groq.push(
      `{_type == "${expandReference}" => @->{${projection}},_type != "${expandReference}" => @{${projection}}}`,
    );
  }

  // Append the unwrapped projection.
  else {
    groq.push(`{${projection}}`);
  }

  // Create object schema.
  const schema = Type.Object(properties, {
    groq: groq.join(""),
  }) as TProjection<T>;

  // Attach additional attributes.
  schema["groqType"] = "projection";
  if (options) schema[optionsKey] = options;
  schema[originalPropertiesKey] = properties;

  return schema;
}

/**
 * Return true if the given schema is a projection.
 */
export function isProjection(value: unknown): value is TProjection {
  return TypeGuard.IsSchema(value) && "projection" === value.groqType;
}

/**
 * Expand the given projection.
 */
export function expandProjection<T extends TProjection>(
  schema: T,
  expandReference?: string,
): T {
  return Projection(schema[originalPropertiesKey], {
    ...schema[optionsKey],
    expandReference: expandReference ?? true,
  }) as T;
}

/**
 * Apply a filter to the given projection.
 */
export function filterProjection<T extends TProjection>(
  schema: T,
  filter: string,
): T {
  return Projection(schema[originalPropertiesKey], {
    ...schema[optionsKey],
    filter,
  }) as T;
}

/**
 * Apply a slice to the given projection.
 */
export function sliceProjection<T extends TProjection>(
  schema: T,
  slice: number,
): T {
  return Projection(schema[originalPropertiesKey], {
    ...schema[optionsKey],
    slice,
  }) as T;
}
