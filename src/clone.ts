import type { TSchema } from "@sinclair/typebox";

import { QueryCacheSymbol } from "./symbols";

/**
 * Clone the given schema, removing the query cache and merging the given properties.
 */
export function cloneSchema<T extends TSchema>(schema: T, merge?: any): T {
  const clonedSchema = { ...schema, ...merge } as T;

  // Remove query cache.
  delete clonedSchema[QueryCacheSymbol];

  return clonedSchema;
}
