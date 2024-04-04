import { test, expect } from "vitest";
import { performance } from "node:perf_hooks";

import * as S from "./schemas";

function makeComplexSchema() {
  const CompanySchema = S.TypedProjection({
    _type: S.Literal("company"),
    title: S.String(),
    director: S.Projection({
      name: S.String(),
    }),
  });

  const PersonSchema = S.TypedProjection({
    _type: S.Literal("person"),
    name: S.String(),
  });

  const UnionSchema = S.TypedUnion([CompanySchema, PersonSchema]).expand(
    "sectionComponentLibrary",
  );

  return S.Collection(UnionSchema).filter(`_type == "movie"`);
}

test("instantiates complex query under perf threshold", async () => {
  const start = performance.now();
  makeComplexSchema();
  const end = performance.now();

  expect(end - start).lessThan(1);
});

test("serializes complex query under perf threshold", async () => {
  const schema = makeComplexSchema();

  const start = performance.now();
  schema.serialize();
  const end = performance.now();

  expect(end - start).lessThan(0.2);
});
