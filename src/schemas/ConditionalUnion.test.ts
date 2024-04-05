import { expect, test, describe } from "vitest";

import { Type } from "@sinclair/typebox";

import { Projection } from "./Projection";
import { ConditionalUnion } from "./ConditionalUnion";

describe("condition serialization", () => {
  test("conditions without default serializes correctly", () => {
    const schema = ConditionalUnion({
      [`_type == "person"`]: Projection({
        _type: Type.Literal("foo"),
        name: Type.String(),
      }),
      [`_type == "company"`]: Projection({
        _type: Type.Literal("company"),
        companyName: Type.String(),
      }),
    });

    expect(schema.serialize()).toBe(
      `{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})}`,
    );
  });

  test("conditions with default serializes correctly", () => {
    const schema = ConditionalUnion({
      [`_type == "person"`]: Projection({
        _type: Type.Literal("foo"),
        name: Type.String(),
      }),
      [`_type == "company"`]: Projection({
        _type: Type.Literal("company"),
        companyName: Type.String(),
      }),
      default: Projection({
        _type: Type.String(),
      }),
    });

    expect(schema.serialize()).toBe(
      `{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName},{_type})}`,
    );
  });
});

describe("reference expansion", () => {
  test("expansion option adds wrapper to groq", () => {
    const schema = ConditionalUnion(
      {
        [`_type == "person"`]: Projection({
          _type: Type.Literal("foo"),
          name: Type.String(),
        }),
        [`_type == "company"`]: Projection({
          _type: Type.Literal("company"),
          companyName: Type.String(),
        }),
      },
      { expansionOption: true },
    );

    expect(schema.serialize()).toBe(
      `{...@->{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})}}`,
    );
  });

  test("expansion option with field name adds wrapper to groq", () => {
    const schema = ConditionalUnion(
      {
        [`_type == "person"`]: Projection({
          _type: Type.Literal("foo"),
          name: Type.String(),
        }),
        [`_type == "company"`]: Projection({
          _type: Type.Literal("company"),
          companyName: Type.String(),
        }),
      },
      { expansionOption: "reference" },
    );

    expect(schema.serialize()).toBe(
      `{_type == "reference" => @->{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})},_type != "reference" => @{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})}}`,
    );
  });

  test("expand method clones the projection", () => {
    const schema = ConditionalUnion({
      [`_type == "person"`]: Projection({
        _type: Type.Literal("foo"),
        name: Type.String(),
      }),
      [`_type == "company"`]: Projection({
        _type: Type.Literal("company"),
        companyName: Type.String(),
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
