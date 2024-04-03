import { expect, test } from "vitest";

import * as S from "./index";

test("creates an extended conditional union", () => {
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

  expect(schema.groq).toBe(
    `{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName},{"_rawType":_type,"_type":"unknown"})}`,
  );
});
