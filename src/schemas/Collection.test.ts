import { expect, test, describe } from "vitest";

import { Type } from "@sinclair/typebox";

import { Collection } from "./Collection";
import { Projection } from "./Projection";
import { TypedUnion } from "./TypedUnion";
import { TypedProjection } from "./TypedProjection";

describe("filtering", () => {
  test("empty brackets when no filter or slice", () => {
    const schema = Collection(
      Projection({
        _type: Type.Literal("movie"),
        name: Type.String(),
        genre: Type.String(),
      }),
    );

    expect(schema.serialize()).toBe(`[]{_key,...@{_type,name,genre}}`);
  });

  test("set filter with empty slice", () => {
    const schema = Collection(
      Projection({
        _type: Type.Literal("movie"),
        name: Type.String(),
        genre: Type.String(),
      }),
      { filter: `genre == "action"` },
    );

    expect(schema.serialize()).toBe(
      `[genre == "action"]{_key,...@{_type,name,genre}}`,
    );
  });

  test("filter method clones the schema", () => {
    const schema = Collection(
      Projection({
        _type: Type.Literal("movie"),
        name: Type.String(),
        genre: Type.String(),
      }),
    );

    const filteredSchema = schema.filter(`genre == "action"`);

    expect(schema.serialize()).toBe(`[]{_key,...@{_type,name,genre}}`);

    expect(filteredSchema.serialize()).toBe(
      `[genre == "action"]{_key,...@{_type,name,genre}}`,
    );
  });

  test("accepts raw filter without wrapping in extra brackets", () => {
    const schema = Collection(
      Projection({
        _type: Type.Literal("movie"),
        name: Type.String(),
        genre: Type.String(),
      }),
      { filter: `[_type == "movie" && foo = $bar][0]["content"]` },
    );

    expect(schema.serialize()).toBe(
      `[_type == "movie" && foo = $bar][0]["content"]{_key,...@{_type,name,genre}}`,
    );
  });

  test("accepts raw filter with a star and drops the star", () => {
    const schema = Collection(
      Projection({
        _type: Type.Literal("movie"),
        name: Type.String(),
        genre: Type.String(),
      }),
      { filter: `*[_type == "movie" && foo = $bar][0]["content"]` },
    );

    expect(schema.serialize()).toBe(
      `[_type == "movie" && foo = $bar][0]["content"]{_key,...@{_type,name,genre}}`,
    );
  });
});

describe("slicing", () => {
  test("set slice without a filter", () => {
    const schema = Collection(
      Projection({
        _type: Type.Literal("movie"),
        name: Type.String(),
        genre: Type.String(),
      }),
      { slice: [0, 3] },
    );

    expect(schema.serialize()).toBe(`[0...3]{_key,...@{_type,name,genre}}`);
  });

  test("set slice with a filter", () => {
    const schema = Collection(
      Projection({
        _type: Type.Literal("movie"),
        name: Type.String(),
        genre: Type.String(),
      }),
      { filter: `genre == "action"`, slice: [0, 3] },
    );

    expect(schema.serialize()).toBe(
      `[genre == "action"][0...3]{_key,...@{_type,name,genre}}`,
    );
  });

  test("slice method clones the schema", () => {
    const schema = Collection(
      Projection({
        _type: Type.Literal("movie"),
        name: Type.String(),
        genre: Type.String(),
      }),
    );

    const slicedSchema = schema.slice([0, 3]);

    expect(schema.serialize()).toBe(`[]{_key,...@{_type,name,genre}}`);

    expect(slicedSchema.serialize()).toBe(
      `[0...3]{_key,...@{_type,name,genre}}`,
    );
  });
});

describe("nesting", () => {
  test("serializes correctly when nested", () => {
    const schema = Projection({
      movies: Collection(
        Projection({
          _type: Type.Literal("movie"),
          name: Type.String(),
          genre: Type.String(),
        }),
      ),
    });

    expect(schema.serialize()).toBe(`{movies[]{_key,...@{_type,name,genre}}}`);
  });
});

describe("serialization", () => {
  test("collection of unknown serializes without projection", () => {
    const schema = Collection(Type.Unknown());
    expect(schema.serialize()).toBe(`[]`);
  });

  test("collection of string serializes without projection", () => {
    const schema = Collection(Type.String());
    expect(schema.serialize()).toBe(`[]`);
  });

  test("collection of typed union serializes correctly", () => {
    const UnionSchema = TypedUnion([
      TypedProjection({
        _type: Type.Literal("movie"),
        name: Type.String(),
        genre: Type.String(),
      }),
      TypedProjection({
        _type: Type.Literal("producer"),
        firstName: Type.String(),
        lastName: Type.String(),
      }),
    ]);

    const schema = Collection(UnionSchema);

    expect(schema.serialize()).toBe(
      `[]{_key,...@{...select(_type == "movie" => {_type,name,genre},_type == "producer" => {_type,firstName,lastName},{"_rawType":_type,"_type":"unknown"})}}`,
    );
  });
});
