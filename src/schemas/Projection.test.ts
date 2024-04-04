import { expect, test, describe } from "vitest";

import * as S from "./index";

describe("filtering", () => {
  test("set filter with default slice", () => {
    const schema = S.Projection(
      {
        _type: S.Literal("movie"),
        name: S.String(),
        genre: S.String(),
      },
      { filter: `genre == "action"` },
    );

    expect(schema.serialize()).toBe(`[genre == "action"][0]{_type,name,genre}`);
  });

  test("filter method clones the projection", () => {
    const schema = S.Projection({
      _type: S.Literal("movie"),
      name: S.String(),
      genre: S.String(),
    });

    const filteredSchema = schema.filter(`genre == "action"`);

    expect(schema.serialize()).toBe(`{_type,name,genre}`);

    expect(filteredSchema.serialize()).toBe(
      `[genre == "action"][0]{_type,name,genre}`,
    );
  });

  test("accepts raw filter without wrapping in extra brackets", () => {
    const schema = S.Projection(
      {
        _type: S.Literal("movie"),
        name: S.String(),
        genre: S.String(),
      },
      { filter: `[_type == "movie" && foo = $bar][0]["content"][1]` },
    );

    expect(schema.serialize()).toBe(
      `[_type == "movie" && foo = $bar][0]["content"][1]{_type,name,genre}`,
    );
  });

  test("accepts raw filter with a star and keeps the star", () => {
    const schema = S.Projection(
      {
        _type: S.Literal("movie"),
        name: S.String(),
        genre: S.String(),
      },
      { filter: `*[_type == "movie" && foo = $bar][0]["content"][1]` },
    );

    expect(schema.serialize()).toBe(
      `*[_type == "movie" && foo = $bar][0]["content"][1]{_type,name,genre}`,
    );
  });
});

describe("slicing", () => {
  test("set slice without a filter", () => {
    const schema = S.Projection(
      {
        _type: S.Literal("movie"),
        name: S.String(),
        genre: S.String(),
      },
      { slice: 0 },
    );

    expect(schema.serialize()).toBe(`[0]{_type,name,genre}`);
  });

  test("set slice with a filter", () => {
    const schema = S.Projection(
      {
        _type: S.Literal("movie"),
        name: S.String(),
        genre: S.String(),
      },
      { filter: `genre == "action"`, slice: 3 },
    );

    expect(schema.serialize()).toBe(`[genre == "action"][3]{_type,name,genre}`);
  });

  test("slice method clones the projection", () => {
    const schema = S.Projection({
      _type: S.Literal("movie"),
      name: S.String(),
      genre: S.String(),
    });

    const slicedSchema = schema.slice(3);

    expect(schema.serialize()).toBe(`{_type,name,genre}`);

    expect(slicedSchema.serialize()).toBe(`[3]{_type,name,genre}`);
  });
});

describe("key formatting", () => {
  test("primitives use naked keys", () => {
    const schema = S.Projection({
      _type: S.Literal("user"),
      name: S.String(),
      age: S.Number(),
      isActive: S.Boolean(),
    });

    expect(schema.serialize()).toBe("{_type,name,age,isActive}");
  });

  test("raw uses quoted key", () => {
    const schema = S.Projection({
      name: S.Raw(`"literal string"`, S.String()),
    });

    expect(schema.serialize()).toBe(`{"name":"literal string"}`);
  });

  test("nested projection uses unquoted key", () => {
    const schema = S.Projection({
      name: S.String(),
      address: S.Projection({
        street: S.String(),
        city: S.String(),
        postcode: S.String(),
      }),
    });

    expect(schema.serialize()).toBe(`{name,address{street,city,postcode}}`);
  });

  test("nested array uses unquoted key", () => {
    const schema = S.Projection({
      name: S.String(),
      invoices: S.Collection(S.Unknown()),
    });

    expect(schema.serialize()).toBe(`{name,invoices[]}`);
  });
});

describe("reference expansion", () => {
  test("expanded reference adds wrapper", () => {
    const schema = S.Projection(
      {
        name: S.String(),
        email: S.String(),
      },
      { expansionOption: true },
    );

    expect(schema.serialize()).toBe(`{...@->{name,email}}`);
  });

  test("conditional expanded reference adds wrapper", () => {
    const schema = S.Projection(
      {
        name: S.String(),
        email: S.String(),
      },
      { expansionOption: "reference" },
    );

    expect(schema.serialize()).toBe(
      `{_type == "reference" => @->{name,email},_type != "reference" => @{name,email}}`,
    );
  });

  test("expand method clones the projection", () => {
    const schema = S.Projection({
      name: S.String(),
      email: S.String(),
    });

    const expandedSchema = schema.expand();

    expect(schema.serialize()).toBe(`{name,email}`);

    expect(expandedSchema.serialize()).toBe(`{...@->{name,email}}`);
  });
});
