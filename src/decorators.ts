import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import type { TString, TObject } from "@sinclair/typebox";

/**
 * Prepend the _key attribute to the given object schema.
 */
export function decorateKey<T extends TObject>(
  schema: T,
): T extends TObject<infer P> ? TObject<P & { _key: TString }> : never {
  const newSchema = Value.Clone(schema);

  newSchema.properties = Object.assign(
    { _key: Type.String() },
    newSchema.properties,
  );

  // @ts-expect-error
  return newSchema;
}
