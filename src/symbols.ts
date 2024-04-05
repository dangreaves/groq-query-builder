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
