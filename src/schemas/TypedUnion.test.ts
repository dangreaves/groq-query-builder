import { expect, test } from "vitest";

import { Type } from "@sinclair/typebox";

import { TypedUnion } from "./TypedUnion";
import { TypedProjection } from "./TypedProjection";

test("creates an extended conditional union", () => {
  const schema = TypedUnion([
    TypedProjection({
      _type: Type.Literal("person"),
      name: Type.String(),
    }),
    TypedProjection({
      _type: Type.Literal("company"),
      companyName: Type.String(),
    }),
  ]);

  expect(schema.serialize()).toBe(
    `{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName},{"_rawType":_type,"_type":"unknown"})}`,
  );
});
