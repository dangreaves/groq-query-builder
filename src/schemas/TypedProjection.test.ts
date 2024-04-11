import { expect, test } from "vitest";

import { Type } from "@sinclair/typebox";

import { serializeProjection } from "./Projection";
import { TypedProjection } from "./TypedProjection";

test("creates a projection with _type literal", () => {
  const schema = TypedProjection({
    _type: Type.Literal("user"),
    name: Type.String(),
    email: Type.String(),
  });

  expect(serializeProjection(schema)).toBe(`{_type,name,email}`);
});

test("creates a greedy projection with _type literal", () => {
  const schema = TypedProjection(
    {
      _type: Type.Literal("user"),
      name: Type.String(),
      email: Type.String(),
    },
    { greedy: true },
  );

  expect(serializeProjection(schema)).toBe(`{...,_type,name,email}`);
});
