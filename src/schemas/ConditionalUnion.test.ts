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

    expect(schema.serialize()).toBe(
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

    expect(schema.serialize()).toBe(
      `{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName},{_type})}`,
    );
  });
});

describe("reference expansion", () => {
  test("expansion option adds wrapper to groq", () => {
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
      { expansionOption: true },
    );

    expect(schema.serialize()).toBe(
      `{...@->{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})}}`,
    );
  });

  test("expansion option with field name adds wrapper to groq", () => {
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
      { expansionOption: "reference" },
    );

    expect(schema.serialize()).toBe(
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

    expect(schema.serialize()).toBe(
      `{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})}`,
    );

    expect(expandedSchema.serialize()).toBe(
      `{...@->{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})}}`,
    );
  });
});
