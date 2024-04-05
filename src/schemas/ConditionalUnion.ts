import { Type, TSchema, TUnion, TypeGuard } from "@sinclair/typebox";

import type { TExpansionOption } from "../types";

import { serializeQuery } from "../serialize";

import { TypeSymbol, ExpandSymbol, ConditionsSymbol } from "../symbols";

/**
 * Options available when creating a conditional union.
 */
export type TConditionalUnionOptions = {
  expand?: TExpansionOption;
};

/**
 * Additional attributes added to underlying schema.
 */
type AdditionalAttributes = {
  /** Array of conditions in order of the schemas added to the union */
  [ConditionsSymbol]: string[];
  [TypeSymbol]: "ConditionalUnion";
  [ExpandSymbol]: TConditionalUnionOptions["expand"];
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
    [ExpandSymbol]: options?.expand,
    [TypeSymbol]: "ConditionalUnion",
    [ConditionsSymbol]: Object.keys(conditions),
  } satisfies AdditionalAttributes) as TConditionalUnion<T>;
}

/**
 * Return true if the given value is a conditional union.
 */
export function isConditionalUnion(value: unknown): value is TConditionalUnion {
  return (
    TypeGuard.IsSchema(value) &&
    "ConditionalUnion" === (value as TConditionalUnion)[TypeSymbol]
  );
}

/**
 * Serialize a conditional union.
 */
export function serializeConditionalUnion(schema: TConditionalUnion): string {
  const groq: string[] = [];

  // Calculate a set of conditions for select().
  const selectConditions = schema[ConditionsSymbol].map((condition, key) => {
    // Default condition is always added last.
    if ("default" == condition) return null;

    // Find schema according to key for this condition.
    const conditionSchema = schema.anyOf[key];
    if (!conditionSchema) return null;

    // Serialize the condition schema.
    const conditionGroq = serializeQuery(conditionSchema) || "...";

    // Return it in the right format.
    return `${condition} => ${conditionGroq}`;
  }).filter(Boolean) as string[];

  // Find the default condition if provided.
  const defaultConditionIndex = schema[ConditionsSymbol].indexOf("default");
  const defaultConditionSchema =
    0 <= defaultConditionIndex ? schema.anyOf[defaultConditionIndex] : null;

  // Default condition found, serialize and append.
  if (defaultConditionSchema) {
    const conditionGroq = serializeQuery(defaultConditionSchema) || "...";
    selectConditions.push(conditionGroq);
  }

  // Wrap conditions in a spread select query.
  const projection = `...select(${selectConditions.join(",")})`;

  // Wrap in a reference expansion.
  if (true === schema[ExpandSymbol]) {
    groq.push(`{...@->{${projection}}}`);
  }

  // Wrap in a conditional reference expansion.
  else if ("string" === typeof schema[ExpandSymbol]) {
    groq.push(
      `{_type == "${schema[ExpandSymbol]}" => @->{${projection}},_type != "${schema[ExpandSymbol]}" => @{${projection}}}`,
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
    [ExpandSymbol]: expand ?? true,
  };
}
