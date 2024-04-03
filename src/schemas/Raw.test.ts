import { expect, test } from "vitest";

import * as S from "./index";

test("outputs raw groq", () => {
  const schema = S.Raw(`"literal string"`, S.String());
  expect(schema.groq).toBe(`"literal string"`);
});
