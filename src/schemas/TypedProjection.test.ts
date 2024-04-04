import { expect, test } from "vitest";

import * as S from "./index";

test("creates an extended projection", () => {
  const schema = S.TypedProjection({
    _type: S.Literal("user"),
    name: S.String(),
    email: S.String(),
  });

  expect(schema.serialize()).toBe(`{_type,name,email}`);
});
