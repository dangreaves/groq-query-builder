import { expect, test, describe } from "vitest";

import * as S from "./index";

describe("projection", () => {
  test("projects correctly by returning child groq", () => {
    const schema = S.Projection({
      _type: S.Literal("movie"),
      name: S.String(),
      genre: S.Nullable(S.String()),
    });

    expect(schema.groq).toBe(`{_type,name,genre}`);
  });
});
