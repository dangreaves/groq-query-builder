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

    expect(schema.groq).toBe(`[]{_key,...@{_type,name,genre}}`);
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

    expect(schema.groq).toBe(
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

    const filteredSchema = S.filterCollection(schema, `genre == "action"`);

    expect(schema.groq).toBe(`[]{_key,...@{_type,name,genre}}`);

    expect(filteredSchema.groq).toBe(
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

    expect(schema.groq).toBe(`[0...3]{_key,...@{_type,name,genre}}`);
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

    expect(schema.groq).toBe(
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

    const slicedSchema = S.sliceCollection(schema, [0, 3]);

    expect(schema.groq).toBe(`[]{_key,...@{_type,name,genre}}`);
    expect(slicedSchema.groq).toBe(`[0...3]{_key,...@{_type,name,genre}}`);
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

    expect(schema.groq).toBe(`{movies[]{_key,...@{_type,name,genre}}}`);
  });
});
