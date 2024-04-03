import { expect, test } from "vitest";

import * as S from "./index";

test("outputs attribute name to alias", () => {
  const schema = S.Alias("otherField", S.String());
  expect(schema.groq).toBe("otherField");
});
