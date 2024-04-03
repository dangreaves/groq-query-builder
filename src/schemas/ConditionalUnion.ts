import { Type, TSchema, TUnion } from "@sinclair/typebox";

/**
 * Options available when creating a conditional union.
 */
export type TConditionalUnionOptions =
  | {
      expandReference?: boolean | string | undefined;
    }
  | undefined;

/**
 * Symbol for storing options on schema without conflicting with JSON schema.
 */
const optionsKey = Symbol("options");

/**
 * Given a string keyed record of conditions extract array of schemas.
 */
type SchemaArrayFromConditions<T extends Record<string, TSchema>> =
  T extends Record<string, infer B> ? B[] : never;

/**
 * Fetch a union of schemas based on conditions.
 */
export type TConditionalUnion<
  T extends Record<string, TSchema> = Record<string, TSchema>,
> = TUnion<SchemaArrayFromConditions<T>> & {
  [optionsKey]?: TConditionalUnionOptions;
  expand: (expandReference?: string) => TConditionalUnion<T>;
};

/**
 * Fetch a union of schemas based on conditions.
 */
export function ConditionalUnion<
  T extends Record<string, TSchema> = Record<string, TSchema>,
>(conditions: T, options?: TConditionalUnionOptions): TConditionalUnion<T> {
  const { expandReference } = options ?? {};

  let groq = "";

  // Calculate a set of conditions for select().
  const selectConditions = Object.entries(conditions)
    .filter(([condition]) => "default" !== condition)
    .map(([condition, schema]) => {
      if ("default" === condition) return schema.groq;
      return `${condition} => ${schema.groq}`;
    });

  // Add default condition on the end if provided.
  if (conditions["default"]) {
    selectConditions.push(conditions["default"].groq);
  }

  // Wrap conditions in a spread select query.
  const projection = `...select(${selectConditions.join(",")})`;

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

  // Extract an array of schemas from the conditions.
  const schemas = Object.values(conditions);

  // Create union schema.
  const schema = Type.Union(schemas, { groq }) as TConditionalUnion<T>;
  if (options) schema[optionsKey] = options;

  /**
   * Create a copy of this schema with expansion enabled.
   */
  schema.expand = (expandReference?: string) => {
    return ConditionalUnion(conditions, {
      ...options,
      expandReference: expandReference ?? true,
    });
  };

  return schema;
}
