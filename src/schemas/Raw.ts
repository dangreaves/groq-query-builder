import { TSchema } from "@sinclair/typebox";
import { Clone } from "@sinclair/typebox/value";

/**
 * Output raw GROQ.
 */
export function Raw<T extends TSchema = TSchema>(groq: string, schema: T) {
  const clonedSchema = Clone(schema);
  clonedSchema.groq = groq;
  return clonedSchema;
}
