import { Type, TSchema, TUnion, TypeGuard } from "@sinclair/typebox";

import type { TExpansionOption } from "../types";

import { serialize } from "../serialize";

/**
 * Options available when creating a conditional union.
 */
export type TConditionalUnionOptions = {
  expand?: TExpansionOption;
};

/**
 * Symbols for additional attributes on schema.
 */
const TypeAttribute = Symbol("type");
const ExpandAttibute = Symbol("expand");
const ConditionsAttribute = Symbol("conditions");

/**
 * Additional attributes added to underlying schema.
 */
type AdditionalAttributes = {
  [TypeAttribute]: "ConditionalUnion";
  [ConditionsAttribute]: Record<string, TSchema>;
  [ExpandAttibute]: TConditionalUnionOptions["expand"];
};

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
> = TUnion<SchemaArrayFromConditions<T>> & AdditionalAttributes;

/**
 * Fetch a union of schemas based on conditions.
 */
export function ConditionalUnion<
  T extends Record<string, TSchema> = Record<string, TSchema>,
>(conditions: T, options?: TConditionalUnionOptions): TConditionalUnion<T> {
  return Type.Union(Object.values(conditions), {
    [TypeAttribute]: "ConditionalUnion",
    [ConditionsAttribute]: conditions,
    [ExpandAttibute]: options?.expand,
  } satisfies AdditionalAttributes) as TConditionalUnion<T>;
}

/**
 * Return true if the given value is a conditional union.
 */
export function isConditionalUnion(value: unknown): value is TConditionalUnion {
  return (
    TypeGuard.IsSchema(value) &&
    "ConditionalUnion" === (value as TConditionalUnion)[TypeAttribute]
  );
}

/**
 * Serialize a conditional union.
 */
export function serializeConditionalUnion(schema: TConditionalUnion): string {
  const groq: string[] = [];

  // Calculate a set of conditions for select().
  const selectConditions = Object.entries(schema[ConditionsAttribute])
    .filter(([condition]) => "default" !== condition)
    .map(([condition, innerSchema]) => {
      const innerGroq = serialize(innerSchema) || "...";
      return `${condition} => ${innerGroq}`;
    });

  // Add default condition on the end if provided.
  if (schema[ConditionsAttribute]["default"]) {
    const innerGroq =
      serialize(schema[ConditionsAttribute]["default"]) || "...";
    selectConditions.push(innerGroq);
  }

  // Wrap conditions in a spread select query.
  const projection = `...select(${selectConditions.join(",")})`;

  // Wrap in a reference expansion.
  if (true === schema[ExpandAttibute]) {
    groq.push(`{...@->{${projection}}}`);
  }

  // Wrap in a conditional reference expansion.
  else if ("string" === typeof schema[ExpandAttibute]) {
    groq.push(
      `{_type == "${schema[ExpandAttibute]}" => @->{${projection}},_type != "${schema[ExpandAttibute]}" => @{${projection}}}`,
    );
  }

  // Append the unwrapped projection.
  else {
    groq.push(`{${projection}}`);
  }

  return groq.join("");
}

/**
 * Expand a conditional union.
 */
export function expandConditionalUnion<T extends TConditionalUnion>(
  schema: T,
  expand?: TExpansionOption,
): T {
  return {
    ...schema,
    [ExpandAttibute]: expand ?? true,
  };
}
