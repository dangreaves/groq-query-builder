import { expect, test } from "vitest";

import { Type } from "@sinclair/typebox";

import { Nullable } from "./schemas/Nullable";
import { Collection } from "./schemas/Collection";
import { TypedUnion } from "./schemas/TypedUnion";
import { TypedProjection } from "./schemas/TypedProjection";

import { serialize } from "./serialize";

test("serializes collection of typed union with nullable", () => {
  const UnionSchema = TypedUnion([
    TypedProjection({
      _type: Type.Literal("movie"),
      name: Type.String(),
      genre: Type.String(),
      network: Nullable(
        TypedProjection({
          _type: Type.Literal("network"),
          networkName: Type.String(),
        }),
      ),
    }),
    TypedProjection({
      _type: Type.Literal("producer"),
      firstName: Type.String(),
      lastName: Type.String(),
    }),
  ]);

  const schema = Collection(UnionSchema);

  expect(serialize(schema)).toBe(
    `[]{_key,...@{...select(_type == "movie" => {_type,name,genre,network{_type,networkName}},_type == "producer" => {_type,firstName,lastName},{"_rawType":_type,"_type":"unknown"})}}`,
  );
});
