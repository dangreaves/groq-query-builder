/**
 * Attach symbols to schema interface.
 */
declare module "@sinclair/typebox" {
  interface TSchema {
    groq?: string;
  }
}

export { String, Number, Literal, Boolean, Unknown } from "@sinclair/typebox";

export * from "./Alias";
export * from "./Collection";
export * from "./ConditionalUnion";
export * from "./Nullable";
export * from "./Projection";
export * from "./Raw";
export * from "./TypedProjection";
export * from "./TypedUnion";