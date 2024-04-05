import { expect, test } from "vitest";

import { Type } from "@sinclair/typebox";

import { Raw, serializeRaw } from "./Raw";

test("outputs raw groq", () => {
  const schema = Raw(`"literal string"`, Type.String());
  expect(serializeRaw(schema)).toBe(`"literal string"`);
});
