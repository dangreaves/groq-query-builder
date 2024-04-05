import { TSchema } from "@sinclair/typebox";

import { isRaw, serializeRaw } from "./schemas/Raw";

import { isNullable, serializeNullable } from "./schemas/Nullable";

import { isCollection, serializeCollection } from "./schemas/Collection";

import { isProjection, serializeProjection } from "./schemas/Projection";

import {
  isConditionalUnion,
  serializeConditionalUnion,
} from "./schemas/ConditionalUnion";

import { QueryCacheSymbol } from "./symbols";

/**
 * Serialize the given schema to a GROQ string.
 */
export function serializeQuery(schema: TSchema): string {
  if (schema[QueryCacheSymbol]) {
    return schema[QueryCacheSymbol];
  }

  const query = ((): string => {
    if (isRaw(schema)) return serializeRaw(schema);
    if (isNullable(schema)) return serializeNullable(schema);
    if (isCollection(schema)) return serializeCollection(schema);
    if (isProjection(schema)) return serializeProjection(schema);
    if (isConditionalUnion(schema)) return serializeConditionalUnion(schema);
    return "";
  })();

  schema[QueryCacheSymbol] = query;

  return query;
}

/**
 * Make query cache optionally available on all schemas.
 */
declare module "@sinclair/typebox" {
  interface TSchema {
    [QueryCacheSymbol]?: string;
  }
}
