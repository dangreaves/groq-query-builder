import { expect, test } from "vitest";

import { Type } from "@sinclair/typebox";

import { serializeProjection } from "./Projection";
import { TypedProjection } from "./TypedProjection";

test("creates an extended projection", () => {
  const schema = TypedProjection({
    _type: Type.Literal("user"),
    name: Type.String(),
    email: Type.String(),
  });

  expect(serializeProjection(schema)).toBe(`{_type,name,email}`);
});
