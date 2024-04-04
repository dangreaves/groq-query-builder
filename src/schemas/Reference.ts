import { isProjection, expandProjection, type TProjection } from "./Projection";

import {
  isConditionalUnion,
  expandConditionalUnion,
  type TConditionalUnion,
} from "./ConditionalUnion";

/**
 * Dereference the given schema.
 */
export function Reference<T extends TProjection | TConditionalUnion>(
  schema: T,
  conditionalAttribute?: string,
): T {
  if (isProjection(schema)) {
    return expandProjection(schema, conditionalAttribute);
  }

  if (isConditionalUnion(schema)) {
    return expandConditionalUnion(schema, conditionalAttribute);
  }

  return schema;
}
