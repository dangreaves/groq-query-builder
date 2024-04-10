import { Type, TObject, TProperties, TypeGuard } from "@sinclair/typebox";

import type { TExpansionOption } from "../types";

import { cloneSchema } from "../clone";
import { serializeQuery } from "../serialize";

import {
  TypeSymbol,
  SliceSymbol,
  FilterSymbol,
  ExpandSymbol,
} from "../symbols";

/**
 * Options available when creating a projection.
 */
export type TProjectionOptions = {
  slice?: number;
  filter?: string;
  expand?: TExpansionOption;
};

/**
 * Additional attributes added to underlying schema.
 */
type AdditionalAttributes = {
  [TypeSymbol]: "Projection";
  [SliceSymbol]: TProjectionOptions["slice"];
  [FilterSymbol]: TProjectionOptions["filter"];
  [ExpandSymbol]: TProjectionOptions["expand"];
};

/**
 * Fetch a single object projection.
 */
export type TProjection<T extends TProperties = TProperties> = TObject<T>;

/**
 * Fetch a single object projection.
 */
export function Projection<T extends TProperties = TProperties>(
  properties: T,
  options?: TProjectionOptions,
): TProjection<T> {
  return Type.Object(properties, {
    [TypeSymbol]: "Projection",
    [SliceSymbol]: options?.slice,
    [FilterSymbol]: options?.filter,
    [ExpandSymbol]: options?.expand,
  } satisfies AdditionalAttributes) as TProjection<T>;
}

/**
 * Return true if the given value is a projection.
 */
export function isProjection(value: unknown): value is TProjection {
  return (
    TypeGuard.IsSchema(value) &&
    "Projection" === (value as TProjection)[TypeSymbol]
  );
}

/**
 * Serialize a projection.
 */
export function serializeProjection(schema: TProjection): string {
  // We know this schema contains the additional attributes.
  const attributes = schema as unknown as AdditionalAttributes;

  // Trim filter star if provided. This is handled by the client.
  const filter = attributes[FilterSymbol]?.startsWith("*")
    ? attributes[FilterSymbol].substring(1)
    : attributes[FilterSymbol];

  const groq: string[] = [];

  // Append filter if provided.
  if (filter) {
    // Allow raw filters which are already bracketed.
    if (filter.includes("[")) groq.push(filter);
    // Otherwise, wrap it in brackets.
    else groq.push(`[${filter}]`);
  }

  /**
   * Determine if a slice is already added via the filter.
   * The filter option supports "raw" filters where you might pass [foo == "bar"][0] which already
   * has a slice on the end. Therefore, we don't need to slice it further.
   */
  const alreadySliced = filter ? /\[\d+\]$/.test(filter) : false;

  // Append slice if provided, or default 0 if filter provided.
  if (
    !alreadySliced &&
    (filter || "undefined" !== typeof attributes[SliceSymbol])
  ) {
    groq.push(`[${attributes[SliceSymbol] ?? 0}]`);
  }

  // Calculate array of properties and join them into a projection.
  const projection = Object.entries(schema.properties)
    .map(([key, value]) => {
      // Serialize GROQ for this property.
      const innerGroq = serializeQuery(value);

      // Property has it's own GROQ to project.
      if (innerGroq) {
        // If object projection, use an unquoted key.
        if (innerGroq.startsWith("{") || innerGroq.startsWith("["))
          return `${key}${innerGroq}`;

        // If something else, use a quoted key.
        return `"${key}":${innerGroq}`;
      }

      // If no groq, then use a naked key.
      return key;
    })
    .join(",");

  // Wrap in a reference expansion.
  if (true === attributes[ExpandSymbol]) {
    groq.push(`{...@->{${projection}}}`);
  }

  // Wrap in a conditional reference expansion.
  else if ("string" === typeof attributes[ExpandSymbol]) {
    groq.push(
      `{_type == "${attributes[ExpandSymbol]}" => @->{${projection}},_type != "${attributes[ExpandSymbol]}" => @{${projection}}}`,
    );
  }

  // Append the unwrapped projection.
  else {
    groq.push(`{${projection}}`);
  }

  return groq.join("");
}

/**
 * Filter a projection.
 */
export function filterProjection<T extends TProjection>(
  schema: T,
  filter: string,
): T {
  return cloneSchema(schema, {
    [FilterSymbol]: filter,
  } satisfies Partial<AdditionalAttributes>);
}

/**
 * Slice a projection.
 */
export function sliceProjection<T extends TProjection>(
  schema: T,
  slice: number,
): T {
  return cloneSchema(schema, {
    [SliceSymbol]: slice,
  } satisfies Partial<AdditionalAttributes>);
}

/**
 * Expand a projection.
 */
export function expandProjection<T extends TProjection>(
  schema: T,
  expand?: TExpansionOption,
): T {
  return cloneSchema(schema, {
    [ExpandSymbol]: expand ?? true,
  } satisfies Partial<AdditionalAttributes>);
}
