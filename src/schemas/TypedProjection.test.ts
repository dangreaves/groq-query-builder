import { expect, test } from "vitest";

import { Type } from "@sinclair/typebox";

import { TypedProjection } from "./TypedProjection";

test("creates an extended projection", () => {
  const schema = TypedProjection({
    _type: Type.Literal("user"),
    name: Type.String(),
    email: Type.String(),
  });

  expect(schema.serialize()).toBe(`{_type,name,email}`);
});
