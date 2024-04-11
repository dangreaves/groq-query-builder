/**
 * Symbols for additional attributes on schema.
 *
 * We don't use actual symbols here, because they could cause issues with bundling where
 * if this package is included multiple times, you end up with multiple symbols.
 *
 * Instead, we use strings which we have made as unique as possible, so as not to conflict
 * with JSON Schema attributes.
 */
export const GroqSymbol = "_groq";
export const TypeSymbol = "_type";
export const SliceSymbol = "_slice";
export const GreedySymbol = "_greedy";
export const FilterSymbol = "_filter";
export const ExpandSymbol = "_expand";
export const ConditionsSymbol = "_conditions";
export const NeedsIntersectUnwrapSymbol = "_needsIntersectUnwrap";

/**
 * Symbol used to cache GROQ string on a schema.
 */
export const QueryCacheSymbol = "_queryCache";

/**
 * Make query cache optionally available on all schemas.
 */
declare module "@sinclair/typebox" {
  interface TSchema {
    [QueryCacheSymbol]?: string;
  }
}
