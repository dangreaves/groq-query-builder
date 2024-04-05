import { Type, TSchema, TString, TLiteral } from "@sinclair/typebox";

import { Raw } from "./Raw";
import { Projection, TProjection } from "./Projection";

import {
  ConditionalUnion,
  type TConditionalUnion,
  type TConditionalUnionOptions,
} from "./ConditionalUnion";

import type { TTypedProjection } from "./TypedProjection";

/**
 * Type of default projection.
 * This is needed to help TypeScript generate declarations rather than trying to
 * infer the type of DefaultProjection below.
 */
type DefaultProjectionType = TProjection<{
  _rawType: TString;
  _type: TLiteral<"unknown">;
}>;

/**
 * Projection for the "default" condition.
 */
const DefaultProjection = Projection({
  _rawType: Raw("_type", Type.String()),
  _type: Raw(`"unknown"`, Type.Literal("unknown")),
}) satisfies DefaultProjectionType;

/**
 * Fetch a union with conditions based on the _type attribute.
 */
export type TTypedUnion<T extends TTypedProjection[] = TTypedProjection[]> =
  TConditionalUnion<Record<string, [...T, DefaultProjectionType][number]>>;

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

  // @ts-ignore Type instantiation is excessively deep and possibly infinite.
  return ConditionalUnion(conditions, options) as TTypedUnion<T>;
}
