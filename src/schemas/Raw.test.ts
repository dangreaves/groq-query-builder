import { expect, test } from "vitest";

import { Type } from "@sinclair/typebox";

import { Raw } from "./Raw";

test("outputs raw groq", () => {
  const schema = Raw(`"literal string"`, Type.String());
  expect(schema.serialize()).toBe(`"literal string"`);
});
