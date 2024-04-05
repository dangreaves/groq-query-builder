import { expect, test, describe } from "vitest";

import { Type } from "@sinclair/typebox";

import { Projection } from "./Projection";

import {
  ConditionalUnion,
  expandConditionalUnion,
  serializeConditionalUnion,
} from "./ConditionalUnion";

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

    expect(serializeConditionalUnion(schema)).toBe(
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

    expect(serializeConditionalUnion(schema)).toBe(
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
      { expand: true },
    );

    expect(serializeConditionalUnion(schema)).toBe(
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
      { expand: "reference" },
    );

    expect(serializeConditionalUnion(schema)).toBe(
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

    const expandedSchema = expandConditionalUnion(schema);

    expect(serializeConditionalUnion(schema)).toBe(
      `{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})}`,
    );

    expect(serializeConditionalUnion(expandedSchema)).toBe(
      `{...@->{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})}}`,
    );
  });
});
