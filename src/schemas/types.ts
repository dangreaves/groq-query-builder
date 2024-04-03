import type { TString, TNumber, TBoolean, TUnknown } from "@sinclair/typebox";

/**
 * Schemas which are considered "primitive", thus not needing projection.
 */
export type TPrimitive = TString | TNumber | TBoolean | TUnknown;
