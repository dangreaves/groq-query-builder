import { expect, test, describe } from "vitest";

import * as S from "./index";

describe("filtering", () => {
  test("empty brackets when no filter or slice", () => {
    const schema = S.Collection(
      S.Projection({
        _type: S.Literal("movie"),
        name: S.String(),
        genre: S.String(),
      }),
    );

    expect(schema.serialize()).toBe(`[]{_key,...@{_type,name,genre}}`);
  });

  test("set filter with empty slice", () => {
    const schema = S.Collection(
      S.Projection({
        _type: S.Literal("movie"),
        name: S.String(),
        genre: S.String(),
      }),
      { filter: `genre == "action"` },
    );

    expect(schema.serialize()).toBe(
      `[genre == "action"]{_key,...@{_type,name,genre}}`,
    );
  });

  test("filter method clones the schema", () => {
    const schema = S.Collection(
      S.Projection({
        _type: S.Literal("movie"),
        name: S.String(),
        genre: S.String(),
      }),
    );

    const filteredSchema = schema.filter(`genre == "action"`);

    expect(schema.serialize()).toBe(`[]{_key,...@{_type,name,genre}}`);

    expect(filteredSchema.serialize()).toBe(
      `[genre == "action"]{_key,...@{_type,name,genre}}`,
    );
  });
});

describe("slicing", () => {
  test("set slice without a filter", () => {
    const schema = S.Collection(
      S.Projection({
        _type: S.Literal("movie"),
        name: S.String(),
        genre: S.String(),
      }),
      { slice: [0, 3] },
    );

    expect(schema.serialize()).toBe(`[0...3]{_key,...@{_type,name,genre}}`);
  });

  test("set slice with a filter", () => {
    const schema = S.Collection(
      S.Projection({
        _type: S.Literal("movie"),
        name: S.String(),
        genre: S.String(),
      }),
      { filter: `genre == "action"`, slice: [0, 3] },
    );

    expect(schema.serialize()).toBe(
      `[genre == "action"][0...3]{_key,...@{_type,name,genre}}`,
    );
  });

  test("slice method clones the schema", () => {
    const schema = S.Collection(
      S.Projection({
        _type: S.Literal("movie"),
        name: S.String(),
        genre: S.String(),
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
    const schema = S.Projection({
      movies: S.Collection(
        S.Projection({
          _type: S.Literal("movie"),
          name: S.String(),
          genre: S.String(),
        }),
      ),
    });

    expect(schema.serialize()).toBe(`{movies[]{_key,...@{_type,name,genre}}}`);
  });
});

describe("serialization", () => {
  test("collection of unknown serializes without projection", () => {
    const schema = S.Collection(S.Unknown());
    expect(schema.serialize()).toBe(`[]`);
  });

  test("collection of string serializes without projection", () => {
    const schema = S.Collection(S.String());
    expect(schema.serialize()).toBe(`[]`);
  });
});
