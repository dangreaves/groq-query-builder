import type { Static, TArray } from "@sinclair/typebox";

import type { BaseQuery, ArrayQuery } from "./query";

/**
 * Infer result type from the given query.
 */
export type InferFromQuery<Q extends BaseQuery<any>> =
  Q extends ArrayQuery<infer S>
    ? Static<TArray<S>>
    : Q extends BaseQuery<infer S>
      ? Static<S>
      : never;
