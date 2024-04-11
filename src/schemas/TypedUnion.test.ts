import { expect, test } from "vitest";

import { Type } from "@sinclair/typebox";

import { TypedUnion } from "./TypedUnion";
import { TypedProjection } from "./TypedProjection";
import { serializeConditionalUnion } from "./ConditionalUnion";

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

  expect(serializeConditionalUnion(schema)).toBe(
    `{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName},{"_rawType":_type,"_type":"unknown"})}`,
  );
});

test("serializes correctly for greedy projections (which are intersects, not objects)", () => {
  const schema = TypedUnion([
    TypedProjection({
      _type: Type.Literal("person"),
      name: Type.String(),
    }),
    TypedProjection(
      {
        _type: Type.Literal("company"),
        companyName: Type.String(),
      },
      { greedy: true },
    ),
  ]);

  expect(serializeConditionalUnion(schema)).toBe(
    `{...select(_type == "person" => {_type,name},_type == "company" => {...,_type,companyName},{"_rawType":_type,"_type":"unknown"})}`,
  );
});
