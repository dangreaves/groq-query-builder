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

    expect(schema.groq).toBe(`[genre == "action"][0]{_type,name,genre}`);
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

    expect(schema.groq).toBe(`[0]{_type,name,genre}`);
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

    expect(schema.groq).toBe(`[genre == "action"][3]{_type,name,genre}`);
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

    expect(schema.groq).toBe("{_type,name,age,isActive}");
  });

  test("alias uses quoted key", () => {
    const schema = S.Projection({
      name: S.Alias("otherField", S.String()),
    });

    expect(schema.groq).toBe(`{"name":otherField}`);
  });

  test("raw uses quoted key", () => {
    const schema = S.Projection({
      name: S.Raw(`"literal string"`, S.String()),
    });

    expect(schema.groq).toBe(`{"name":"literal string"}`);
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

    expect(schema.groq).toBe(`{name,address{street,city,postcode}}`);
  });

  test("nested array uses unquoted key", () => {
    const schema = S.Projection({
      name: S.String(),
      invoices: S.Collection(S.Unknown()),
    });

    expect(schema.groq).toBe(`{name,invoices[]}`);
  });
});

describe("reference expansion", () => {
  test("expanded reference adds wrapper", () => {
    const schema = S.Projection(
      {
        name: S.String(),
        email: S.String(),
      },
      { expandReference: true },
    );

    expect(schema.groq).toBe(`{...@->{name,email}}`);
  });

  test("conditional expanded reference adds wrapper", () => {
    const schema = S.Projection(
      {
        name: S.String(),
        email: S.String(),
      },
      { expandReference: "reference" },
    );

    expect(schema.groq).toBe(
      `{_type == "reference" => @->{name,email},_type != "reference" => @{name,email}}`,
    );
  });

  test("expand method clones the projection", () => {
    const schema = S.Projection({
      name: S.String(),
      email: S.String(),
    });

    const expandedSchema = schema.expand();

    expect(schema.groq).toBe(`{name,email}`);

    expect(expandedSchema.groq).toBe(`{...@->{name,email}}`);
  });

  test("expand method with conditional clones the projection", () => {
    const schema = S.Projection({
      name: S.String(),
      email: S.String(),
    });

    const expandedSchema = schema.expand("reference");

    expect(schema.groq).toBe(`{name,email}`);

    expect(expandedSchema.groq).toBe(
      `{_type == "reference" => @->{name,email},_type != "reference" => @{name,email}}`,
    );
  });
});
