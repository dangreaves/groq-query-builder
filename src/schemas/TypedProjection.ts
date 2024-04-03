import { TLiteral, TProperties } from "@sinclair/typebox";

import {
  Projection,
  type TProjection,
  type TProjectionOptions,
} from "./Projection";

/**
 * Object properties with required _type attribute.
 */
type PropertiesWithType = TProperties & { _type: TLiteral };

/**
 * Fetch a projection with required _type attribute.
 */
export type TTypedProjection<
  T extends PropertiesWithType = PropertiesWithType,
> = TProjection<T>;

/**
 * Fetch a projection with required _type attribute.
 */
export function TypedProjection<
  T extends PropertiesWithType = PropertiesWithType,
>(properties: T, options?: TProjectionOptions): TTypedProjection<T> {
  return Projection(properties, options);
}
