import { Type, TSchema, TUnion, TypeGuard } from "@sinclair/typebox";

/**
 * Options available when creating a conditional union.
 */
export type TConditionalUnionOptions =
  | {
      expandReference?: boolean | string | undefined;
    }
  | undefined;

/**
 * Symbols for storing options on schema without conflicting with JSON schema.
 */
const optionsKey = Symbol("options");
const originalConditionsKey = Symbol("originalConditions");

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
  groqType: "conditionalUnion";
  [optionsKey]?: TConditionalUnionOptions;
  [originalConditionsKey]: T;
};

/**
 * Fetch a union of schemas based on conditions.
 */
export function ConditionalUnion<
  T extends Record<string, TSchema> = Record<string, TSchema>,
>(conditions: T, options?: TConditionalUnionOptions): TConditionalUnion<T> {
  const { expandReference } = options ?? {};

  const groq: string[] = [];

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

  // Extract an array of schemas from the conditions.
  const schemas = Object.values(conditions);

  // Create union schema.
  const schema = Type.Union(schemas, {
    groq: groq.join(""),
  }) as TConditionalUnion<T>;

  // Attach additional attributes.
  schema.groqType = "conditionalUnion";
  if (options) schema[optionsKey] = options;
  schema[originalConditionsKey] = conditions;

  return schema;
}

/**
 * Return true if the given schema is a conditional union.
 */
export function isConditionalUnion(value: unknown): value is TConditionalUnion {
  return TypeGuard.IsSchema(value) && "conditionalUnion" === value.groqType;
}

/**
 * Expand the given conditional union.
 */
export function expandConditionalUnion<T extends TConditionalUnion>(
  schema: T,
  expandReference?: string,
): T {
  return ConditionalUnion(schema[originalConditionsKey], {
    ...schema[optionsKey],
    expandReference: expandReference ?? true,
  }) as T;
}
