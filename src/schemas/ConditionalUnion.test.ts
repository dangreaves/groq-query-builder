import { expect, test, describe } from "vitest";

import * as S from "./index";

describe("condition serialization", () => {
  test("conditions without default serializes correctly", () => {
    const schema = S.ConditionalUnion({
      [`_type == "person"`]: S.Projection({
        _type: S.Literal("foo"),
        name: S.String(),
      }),
      [`_type == "company"`]: S.Projection({
        _type: S.Literal("company"),
        companyName: S.String(),
      }),
    });

    expect(schema.groq).toBe(
      `{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})}`,
    );
  });

  test("conditions with default serializes correctly", () => {
    const schema = S.ConditionalUnion({
      [`_type == "person"`]: S.Projection({
        _type: S.Literal("foo"),
        name: S.String(),
      }),
      [`_type == "company"`]: S.Projection({
        _type: S.Literal("company"),
        companyName: S.String(),
      }),
      default: S.Projection({
        _type: S.String(),
      }),
    });

    expect(schema.groq).toBe(
      `{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName},{_type})}`,
    );
  });
});

describe("reference expansion", () => {
  test("expanded reference adds wrapper", () => {
    const schema = S.ConditionalUnion(
      {
        [`_type == "person"`]: S.Projection({
          _type: S.Literal("foo"),
          name: S.String(),
        }),
        [`_type == "company"`]: S.Projection({
          _type: S.Literal("company"),
          companyName: S.String(),
        }),
      },
      { expandReference: true },
    );

    expect(schema.groq).toBe(
      `{...@->{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})}}`,
    );
  });

  test("conditional expanded reference adds wrapper", () => {
    const schema = S.ConditionalUnion(
      {
        [`_type == "person"`]: S.Projection({
          _type: S.Literal("foo"),
          name: S.String(),
        }),
        [`_type == "company"`]: S.Projection({
          _type: S.Literal("company"),
          companyName: S.String(),
        }),
      },
      { expandReference: "reference" },
    );

    expect(schema.groq).toBe(
      `{_type == "reference" => @->{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})},_type != "reference" => @{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})}}`,
    );
  });

  test("expand method clones the projection", () => {
    const schema = S.ConditionalUnion({
      [`_type == "person"`]: S.Projection({
        _type: S.Literal("foo"),
        name: S.String(),
      }),
      [`_type == "company"`]: S.Projection({
        _type: S.Literal("company"),
        companyName: S.String(),
      }),
    });

    const expandedSchema = schema.expand();

    expect(schema.groq).toBe(
      `{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})}`,
    );

    expect(expandedSchema.groq).toBe(
      `{...@->{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})}}`,
    );
  });

  test("expand method with conditional clones the projection", () => {
    const schema = S.ConditionalUnion({
      [`_type == "person"`]: S.Projection({
        _type: S.Literal("foo"),
        name: S.String(),
      }),
      [`_type == "company"`]: S.Projection({
        _type: S.Literal("company"),
        companyName: S.String(),
      }),
    });

    const expandedSchema = schema.expand("reference");

    expect(schema.groq).toBe(
      `{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})}`,
    );

    expect(expandedSchema.groq).toBe(
      `{_type == "reference" => @->{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})},_type != "reference" => @{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})}}`,
    );
  });
});
