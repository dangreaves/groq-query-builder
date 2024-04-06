/**
 * Symbols for additional attributes on schema.
 */
export const GroqSymbol = Symbol("groq");
export const TypeSymbol = Symbol("type");
export const SliceSymbol = Symbol("slice");
export const FilterSymbol = Symbol("filter");
export const ExpandSymbol = Symbol("expand");
export const ConditionsSymbol = Symbol("conditions");
export const NeedsIntersectUnwrapSymbol = Symbol("needsIntersectUnwrap");

/**
 * Symbol used to cache GROQ string on a schema.
 */
export const QueryCacheSymbol = Symbol("queryCache");

/**
 * Make query cache optionally available on all schemas.
 */
declare module "@sinclair/typebox" {
  interface TSchema {
    [QueryCacheSymbol]?: string;
  }
}
