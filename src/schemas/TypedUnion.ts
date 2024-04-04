import { Type, type TSchema } from "@sinclair/typebox";

import { Raw } from "./Raw";
import { Projection } from "./Projection";

import {
  ConditionalUnion,
  type TConditionalUnion,
  type TConditionalUnionOptions,
} from "./ConditionalUnion";

import type { TTypedProjection } from "./TypedProjection";

/**
 * Projection for the "default" condition.
 */
const DefaultProjection = Projection({
  _rawType: Raw("_type", Type.String()),
  _type: Raw(`"unknown"`, Type.Literal("unknown")),
});

/**
 * Fetch a union with conditions based on the _type attribute.
 */
export type TTypedUnion<T extends TTypedProjection[] = TTypedProjection[]> =
  TConditionalUnion<Record<string, [...T, typeof DefaultProjection][number]>>;

/**
 * Fetch a union with conditions based on the _type attribute.
 */
export function TypedUnion<T extends TTypedProjection[] = TTypedProjection[]>(
  schemas: T,
  options?: TConditionalUnionOptions,
): TTypedUnion<T> {
  const conditions = schemas.reduce(
    (acc, schema) => {
      return {
        ...acc,
        [`_type == "${schema.properties._type.const}"`]: schema,
      };
    },
    { default: DefaultProjection } as Record<string, TSchema>,
  );

  // @ts-ignore Types are too deep.
  return ConditionalUnion(conditions, options) as TTypedUnion<T>;
}
