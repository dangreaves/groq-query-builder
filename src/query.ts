import { Type, TypeGuard } from "@sinclair/typebox";

import type { TSchema, TArray } from "@sinclair/typebox";

import {
  isAlias,
  needsExpansion,
  getAliasLiteral,
  TUnionProjection,
  isUnionProjection,
  getConditionalExpansionType,
} from "./schemas";

export type Slice = { from: number; to?: number | undefined };

export type QueryPayload<T extends TSchema> = {
  schema: T;
  slice?: Slice;
  filters: string[];
};

export abstract class BaseQuery<T extends TSchema> {
  constructor(readonly payload: QueryPayload<T>) {
    //
  }

  /**
   * Resolve the response schema for this query.
   */
  abstract resolveSchema(): TSchema;

  /**
   * Serialize the query to a GROQ string.
   */
  serialize(): string {
    let query = ["*"];

    // Append filters.
    for (const filter of this.payload.filters) {
      query.push(`[${filter}]`);
    }

    /**
     * Append slice conditions.
     * If no slice conditions applied, then [] is added, because Sanity will return an array.
     * @todo Could refactor this to be part of the array schema along with filter?
     */
    if (this.payload.slice) {
      if ("undefined" !== typeof this.payload.slice.to) {
        query.push(`[${this.payload.slice.from}...${this.payload.slice.to}]`);
      } else {
        query.push(`[${this.payload.slice.from}]`);
      }
    } else {
      query.push("[]");
    }

    // Append serialized projection.
    query.push(this.serializeProjection(this.payload.schema));

    return query.join("");
  }

  /**
   * Recursively serialize the given schema to a GROQ projection string.
   */
  protected serializeProjection(schema: TSchema): string {
    const innerProjection = (() => {
      if (TypeGuard.IsUnknown(schema)) return "";

      if (isUnionProjection(schema)) {
        return `{...select(${this.serializeUnionConditions(schema)})}`;
      }

      if (isAlias(schema)) {
        return getAliasLiteral(schema);
      }

      if (TypeGuard.IsArray(schema)) {
        return `[]${this.serializeProjection(schema.items)}`;
      }

      if (TypeGuard.IsObject(schema)) {
        let attributes: string[] = [];

        for (const [key, value] of Object.entries(schema.properties)) {
          const projection = this.serializeProjection(value);

          attributes.push(
            !projection
              ? key // naked key
              : projection.startsWith("[") ||
                  projection.startsWith("{") ||
                  projection.startsWith("->")
                ? `${key}${projection}` // don't need quotes on key
                : `"${key}":${projection}`, // other types need quoted keys (e.g. literals or references to other fields)
          );
        }

        return `{${attributes.join(",")}}`;
      }

      return "";
    })();

    return this.wrapExpansionQuery(schema, innerProjection);
  }

  /**
   * Serialize the given union projection to a GROQ select conditions string.
   */
  protected serializeUnionConditions(schema: TUnionProjection): string {
    let conditions: string[] = [];

    for (const schemaVariant of schema.anyOf) {
      if ("unknown" !== schemaVariant.properties._type.const) {
        conditions.push(
          `_type == "${schemaVariant.properties._type.const}" => ${this.serializeProjection(schemaVariant)}`,
        );
      } else {
        // Fallback schema
        conditions.push(this.serializeProjection(schemaVariant));
      }
    }

    return conditions.join(",");
  }

  /**
   * Wrap the given GROQ query with an expansion if enabled.
   */
  protected wrapExpansionQuery(schema: TSchema, query: string) {
    if (!needsExpansion(schema)) return query;

    const conditionalExpansionType = getConditionalExpansionType(schema);

    if (conditionalExpansionType) {
      return `{_type == "${conditionalExpansionType}" => @->${query},_type != "${conditionalExpansionType}" => @${query}}`;
    }

    return `->${query}`;
  }
}

export class EntityQuery<T extends TSchema> extends BaseQuery<T> {
  /**
   * Resolve the response schema for this query.
   */
  resolveSchema(): T {
    return this.payload.schema;
  }

  /**
   * Grab attributes with a projection.
   */
  grab<T extends TSchema>(schema: T) {
    return new EntityQuery({
      ...this.payload,
      schema,
    });
  }

  /**
   * Add filter condition.
   */
  filter(filterCondition: string) {
    return new EntityQuery({
      ...this.payload,
      filters: [...this.payload.filters, filterCondition],
    });
  }
}

export class ArrayQuery<T extends TSchema> extends BaseQuery<T> {
  /**
   * Resolve the response schema for this query.
   */
  resolveSchema(): TArray<T> {
    return Type.Array(this.payload.schema);
  }

  /**
   * Grab attributes with a projection.
   */
  grab<T extends TSchema>(schema: T) {
    return new ArrayQuery({
      ...this.payload,
      schema,
    });
  }

  /**
   * Add filter condition.
   */
  filter(filterCondition: string) {
    return new EntityQuery({
      ...this.payload,
      filters: [...this.payload.filters, filterCondition],
    });
  }

  /**
   * Slice the array.
   */
  slice(from: Slice["from"], to?: Slice["to"]) {
    return new EntityQuery({
      ...this.payload,
      slice: { from, to },
    });
  }

  /**
   * Return only the first result.
   */
  first() {
    return this.slice(0);
  }
}

/**
 * Construct an array query filtered by document type.
 */
export function filterByType(type: string, additionalFilter?: string) {
  return new ArrayQuery({
    schema: Type.Unknown(),
    filters: [
      `_type == "${type}"${additionalFilter ? ` && ${additionalFilter}` : ""}`,
    ],
  });
}
