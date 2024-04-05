import { TSchema } from "@sinclair/typebox";

import { isRaw, serializeRaw } from "./schemas/Raw";

import { isNullable, serializeNullable } from "./schemas/Nullable";

import { isCollection, serializeCollection } from "./schemas/Collection";

import { isProjection, serializeProjection } from "./schemas/Projection";

import {
  isConditionalUnion,
  serializeConditionalUnion,
} from "./schemas/ConditionalUnion";

export function serialize(schema: TSchema): string {
  if (isRaw(schema)) return serializeRaw(schema);
  if (isNullable(schema)) return serializeNullable(schema);
  if (isCollection(schema)) return serializeCollection(schema);
  if (isProjection(schema)) return serializeProjection(schema);
  if (isConditionalUnion(schema)) return serializeConditionalUnion(schema);
  return "";
}
