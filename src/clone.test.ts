import { expect, test } from "vitest";
import { Type } from "@sinclair/typebox";

import { Projection } from "./schemas/Projection";

import { cloneSchema } from "./clone";
import { serializeQuery } from "./serialize";

import { QueryCacheSymbol } from "./symbols";

test("removes query cache", () => {
  const schema = Projection({
    foo: Type.String(),
    bar: Type.String(),
  });

  serializeQuery(schema);

  const clonedSchema = cloneSchema(schema);

  expect(schema[QueryCacheSymbol]).toBe("{foo,bar}");
  expect(clonedSchema[QueryCacheSymbol]).toBeUndefined();
});
