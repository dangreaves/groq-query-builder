import { expect, test, describe } from "vitest";

import * as S from "./schemas";

import { needsExpansion } from "./schemas";

describe("expand", () => {
  test("expansion of schema is immutable (expansion does not affect original schema)", () => {
    const OriginalSchema = S.TypedObject({
      _type: S.Literal("producer"),
    });

    const ExpandedSchema = S.Expand(OriginalSchema);

    expect(needsExpansion(ExpandedSchema)).toBe(true);
    expect(needsExpansion(OriginalSchema)).toBe(false);
  });
});
