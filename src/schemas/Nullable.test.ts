import { expect, test, describe } from "vitest";

import { Type } from "@sinclair/typebox";

import { Nullable } from "./Nullable";
import { Projection } from "./Projection";

describe("projection", () => {
  test("projects correctly by returning child groq", () => {
    const schema = Projection({
      _type: Type.Literal("movie"),
      name: Type.String(),
      genre: Nullable(Type.String()),
    });

    expect(schema.serialize()).toBe(`{_type,name,genre}`);
  });
});
