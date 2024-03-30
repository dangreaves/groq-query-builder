import type { Static, TArray, TUnion, TNull } from "@sinclair/typebox";

import type { BaseQuery, ArrayQuery } from "./query";

/**
 * Infer result type from the given query.
 */
export type InferFromQuery<Q extends BaseQuery<any>> =
  Q extends ArrayQuery<infer S>
    ? Static<TArray<S>> // Array queries will return empty array if not found.
    : Q extends BaseQuery<infer S>
      ? Static<TUnion<[S, TNull]>> // Entity queries will return null if not found.
      : never;
