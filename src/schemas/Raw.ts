import { TSchema } from "@sinclair/typebox";
import { Clone } from "@sinclair/typebox/value";

import type { TSerializer } from "../types";

/**
 * Output raw GROQ.
 */
export type TRaw<T extends TSchema = TSchema> = T & {
  serialize: TSerializer;
};

/**
 * Output raw GROQ.
 */
export function Raw<T extends TSchema = TSchema>(groq: string, schema: T) {
  const clonedSchema = Clone(schema) as TRaw<T>;

  clonedSchema.serialize = () => groq;

  return clonedSchema;
}
