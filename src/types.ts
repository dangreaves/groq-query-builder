import type { Static, TSchema, TArray } from "@sinclair/typebox";

import type { BaseQuery, ArrayQuery } from "./query";

import type {
  TProjection,
  TTypedProjection,
  TUnionProjection,
} from "./schemas";

/**
 * Infer result type from the given query.
 */
export type InferFromQuery<Q extends BaseQuery<any>> =
  Q extends ArrayQuery<infer S>
    ? Static<TArray<S>>
    : Q extends BaseQuery<infer S>
      ? Static<S>
      : never;

/**
 * Selection of fields to grab.
 */
export type Selection =
  | Record<string, TSchema>
  | TProjection
  | TTypedProjection
  | TUnionProjection;

/**
 * Infer schema type from a given selection.
 * If selection is a raw object it will be wrapped with a Projection.
 */
export type InferSchemaFromSelection<T extends Selection> = T extends TSchema
  ? T
  : TProjection<T>;
