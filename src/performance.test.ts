import { test, expect } from "vitest";
import { performance } from "node:perf_hooks";

import { Type } from "@sinclair/typebox";
import { Projection, TypedProjection, TypedUnion, Collection } from "./schemas";

import { serialize } from "./serialize";

function makeComplexSchema() {
  const CompanySchema = TypedProjection({
    _type: Type.Literal("company"),
    title: Type.String(),
    director: Projection({
      name: Type.String(),
    }),
  });

  const PersonSchema = TypedProjection({
    _type: Type.Literal("person"),
    name: Type.String(),
  });

  const UnionSchema = TypedUnion([CompanySchema, PersonSchema]);

  return Collection(UnionSchema);
}

test.skip("instantiates complex query under perf threshold", async () => {
  const start = performance.now();
  makeComplexSchema();
  const end = performance.now();

  const score = end - start;
  console.log("score", score);

  expect(score).lessThan(1);
});

test.skip("serializes complex query under perf threshold", async () => {
  const schema = makeComplexSchema();

  const start = performance.now();
  serialize(schema);
  const end = performance.now();

  const score = end - start;
  console.log("score", score);

  expect(score).lessThan(0.2);
});
