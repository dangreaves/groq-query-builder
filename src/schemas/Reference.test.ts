import { expect, test, describe } from "vitest";

import * as S from "./index";

describe("projection", () => {
  test("clones and expands the projection", () => {
    const schema = S.Projection({
      name: S.String(),
      email: S.String(),
    });

    const expandedSchema = S.Reference(schema);

    expect(schema.groq).toBe(`{name,email}`);

    expect(expandedSchema.groq).toBe(`{...@->{name,email}}`);
  });

  test("clones and expands the projection with a conditional", () => {
    const schema = S.Projection({
      name: S.String(),
      email: S.String(),
    });

    const expandedSchema = S.Reference(schema, "reference");

    expect(schema.groq).toBe(`{name,email}`);

    expect(expandedSchema.groq).toBe(
      `{_type == "reference" => @->{name,email},_type != "reference" => @{name,email}}`,
    );
  });
});

describe("typed union", () => {
  test("clones and expands the projection", () => {
    const schema = S.TypedUnion([
      S.TypedProjection({
        _type: S.Literal("person"),
        name: S.String(),
      }),
      S.TypedProjection({
        _type: S.Literal("company"),
        companyName: S.String(),
      }),
    ]);

    const expandedSchema = S.Reference(schema);

    expect(schema.groq).toBe(
      `{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName},{"_rawType":_type,"_type":"unknown"})}`,
    );

    expect(expandedSchema.groq).toBe(
      `{...@->{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName},{"_rawType":_type,"_type":"unknown"})}}`,
    );
  });
});
