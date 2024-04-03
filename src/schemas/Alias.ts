import { TSchema } from "@sinclair/typebox";
import { Clone } from "@sinclair/typebox/value";

/**
 * Alias another attribute.
 */
export function Alias<T extends TSchema = TSchema>(
  attributeToAlias: string,
  schema: T,
) {
  const clonedSchema = Clone(schema);
  clonedSchema.groq = attributeToAlias;
  return clonedSchema;
}
