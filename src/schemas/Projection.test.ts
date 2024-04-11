import { expect, test, describe } from "vitest";

import { Type } from "@sinclair/typebox";

import { Raw } from "./Raw";
import { Collection } from "./Collection";

import {
  Projection,
  sliceProjection,
  filterProjection,
  expandProjection,
  serializeProjection,
} from "./Projection";

describe("filtering", () => {
  test("set filter with default slice", () => {
    const schema = Projection(
      {
        _type: Type.Literal("movie"),
        name: Type.String(),
        genre: Type.String(),
      },
      { filter: `genre == "action"` },
    );

    expect(serializeProjection(schema)).toBe(
      `[genre == "action"][0]{_type,name,genre}`,
    );
  });

  test("filter method clones the projection", () => {
    const schema = Projection({
      _type: Type.Literal("movie"),
      name: Type.String(),
      genre: Type.String(),
    });

    const filteredSchema = filterProjection(schema, `genre == "action"`);

    expect(serializeProjection(schema)).toBe(`{_type,name,genre}`);

    expect(serializeProjection(filteredSchema)).toBe(
      `[genre == "action"][0]{_type,name,genre}`,
    );
  });

  test("accepts raw filter without wrapping in extra brackets", () => {
    const schema = Projection(
      {
        _type: Type.Literal("movie"),
        name: Type.String(),
        genre: Type.String(),
      },
      { filter: `[_type == "movie" && foo = $bar][0]["content"][1]` },
    );

    expect(serializeProjection(schema)).toBe(
      `[_type == "movie" && foo = $bar][0]["content"][1]{_type,name,genre}`,
    );
  });

  test("accepts raw filter with a star and drops the star", () => {
    const schema = Projection(
      {
        _type: Type.Literal("movie"),
        name: Type.String(),
        genre: Type.String(),
      },
      { filter: `*[_type == "movie" && foo = $bar][0]["content"][1]` },
    );

    expect(serializeProjection(schema)).toBe(
      `[_type == "movie" && foo = $bar][0]["content"][1]{_type,name,genre}`,
    );
  });
});

describe("slicing", () => {
  test("set slice without a filter", () => {
    const schema = Projection(
      {
        _type: Type.Literal("movie"),
        name: Type.String(),
        genre: Type.String(),
      },
      { slice: 0 },
    );

    expect(serializeProjection(schema)).toBe(`[0]{_type,name,genre}`);
  });

  test("set slice with a filter", () => {
    const schema = Projection(
      {
        _type: Type.Literal("movie"),
        name: Type.String(),
        genre: Type.String(),
      },
      { filter: `genre == "action"`, slice: 3 },
    );

    expect(serializeProjection(schema)).toBe(
      `[genre == "action"][3]{_type,name,genre}`,
    );
  });

  test("slice method clones the projection", () => {
    const schema = Projection({
      _type: Type.Literal("movie"),
      name: Type.String(),
      genre: Type.String(),
    });

    const slicedSchema = sliceProjection(schema, 3);

    expect(serializeProjection(schema)).toBe(`{_type,name,genre}`);

    expect(serializeProjection(slicedSchema)).toBe(`[3]{_type,name,genre}`);
  });
});

describe("key formatting", () => {
  test("primitives use naked keys", () => {
    const schema = Projection({
      _type: Type.Literal("user"),
      name: Type.String(),
      age: Type.Number(),
      isActive: Type.Boolean(),
    });

    expect(serializeProjection(schema)).toBe("{_type,name,age,isActive}");
  });

  test("raw uses quoted key", () => {
    const schema = Projection({
      name: Raw(`"Type.Literal string"`, Type.String()),
    });

    expect(serializeProjection(schema)).toBe(`{"name":"Type.Literal string"}`);
  });

  test("nested projection uses unquoted key", () => {
    const schema = Projection({
      name: Type.String(),
      address: Projection({
        street: Type.String(),
        city: Type.String(),
        postcode: Type.String(),
      }),
    });

    expect(serializeProjection(schema)).toBe(
      `{name,address{street,city,postcode}}`,
    );
  });

  test("nested array uses unquoted key", () => {
    const schema = Projection({
      name: Type.String(),
      invoices: Collection(Type.Unknown()),
    });

    expect(serializeProjection(schema)).toBe(`{name,invoices[]}`);
  });
});

describe("reference expansion", () => {
  test("expanded reference adds wrapper", () => {
    const schema = Projection(
      {
        name: Type.String(),
        email: Type.String(),
      },
      { expand: true },
    );

    expect(serializeProjection(schema)).toBe(`{...@->{name,email}}`);
  });

  test("conditional expanded reference adds wrapper", () => {
    const schema = Projection(
      {
        name: Type.String(),
        email: Type.String(),
      },
      { expand: "reference" },
    );

    expect(serializeProjection(schema)).toBe(
      `{_type == "reference" => @->{name,email},_type != "reference" => @{name,email}}`,
    );
  });

  test("expand method clones the projection", () => {
    const schema = Projection({
      name: Type.String(),
      email: Type.String(),
    });

    const expandedSchema = expandProjection(schema);

    expect(serializeProjection(schema)).toBe(`{name,email}`);

    expect(serializeProjection(expandedSchema)).toBe(`{...@->{name,email}}`);
  });
});

describe("greedy", () => {
  test("greedy option adds spread to query", () => {
    const schema = Projection(
      {
        name: Type.String(),
        email: Type.String(),
      },
      { greedy: true },
    );

    expect(serializeProjection(schema)).toBe(`{...,name,email}`);
  });
});
