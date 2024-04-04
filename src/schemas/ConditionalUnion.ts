import { Type, TSchema, TUnion } from "@sinclair/typebox";

import type { TSerializer, TExpansionOption } from "../types";

/**
 * Options available when creating a conditional union.
 */
export type TConditionalUnionOptions = {
  expansionOption?: TExpansionOption;
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
> = TUnion<SchemaArrayFromConditions<T>> & {
  __conditions__: T;
  __options__?: TConditionalUnionOptions;
  serialize: TSerializer;
  expand: (this: any, option?: TExpansionOption) => TConditionalUnion<T>;
};

/**
 * Serialize a conditional union.
 */
function serialize(this: TConditionalUnion) {
  const { expansionOption } = this.__options__ ?? {};

  const groq: string[] = [];

  // Calculate a set of conditions for select().
  const selectConditions = Object.entries(this.__conditions__)
    .filter(([condition]) => "default" !== condition)
    .map(([condition, schema]) => {
      const innerGroq = schema.serialize?.() ?? "...";
      return `${condition} => ${innerGroq}`;
    });

  // Add default condition on the end if provided.
  if (this.__conditions__["default"]) {
    const innerGroq = this.__conditions__["default"].serialize?.() ?? "...";
    selectConditions.push(innerGroq);
  }

  // Wrap conditions in a spread select query.
  const projection = `...select(${selectConditions.join(",")})`;

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
 * Expand a conditional union.
 */
function expand<T extends TConditionalUnion>(
  this: T,
  expansionOption?: TExpansionOption,
): T {
  const clonedSchema = Object.assign({}, this) as T;

  clonedSchema.__options__ = {
    ...(clonedSchema.__options__ ?? {}),
    expansionOption: expansionOption ?? true,
  };

  clonedSchema.serialize = serialize.bind(clonedSchema);

  clonedSchema.expand = expand.bind(clonedSchema);

  return clonedSchema;
}

/**
 * Fetch a union of schemas based on conditions.
 */
export function ConditionalUnion<
  T extends Record<string, TSchema> = Record<string, TSchema>,
>(conditions: T, options?: TConditionalUnionOptions): TConditionalUnion<T> {
  const schema = Type.Union(Object.values(conditions)) as TConditionalUnion<T>;

  if (options) {
    schema.__options__ = options;
  }

  schema.__conditions__ = conditions;

  schema.serialize = serialize.bind(schema);

  // @ts-expect-error
  schema.expand = expand.bind(schema);

  return schema;
}
