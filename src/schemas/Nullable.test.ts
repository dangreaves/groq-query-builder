import { expect, test, describe } from "vitest";

import { Type } from "@sinclair/typebox";

import { Nullable } from "./Nullable";
import { Projection, serializeProjection } from "./Projection";

describe("projection", () => {
  test("projects correctly by returning child groq", () => {
    const schema = Projection({
      _type: Type.Literal("movie"),
      name: Type.String(),
      genre: Nullable(Type.String()),
    });

    expect(serializeProjection(schema)).toBe(`{_type,name,genre}`);
  });
});
