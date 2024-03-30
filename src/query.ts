import { Type, TypeGuard } from "@sinclair/typebox";

import type { TObject, TSchema, TArray } from "@sinclair/typebox";

import {
  isProjection,
  isExpandable,
  isCollection,
  TAnyProjection,
  needsExpansion,
  TUnionProjection,
  isTypedProjection,
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

    // Get actual projection from inside array schema if needed.
    const projection = TypeGuard.IsObject(this.payload.schema)
      ? this.payload.schema
      : TypeGuard.IsArray(this.payload.schema) &&
          TypeGuard.IsObject(this.payload.schema.items)
        ? this.payload.schema.items
        : null;

    // Append serialized projection.
    if (projection) {
      query.push(this.serializeProjection(projection));
    }

    return query.join("");
  }

  /**
   * Serialize the given projection schema to a GROQ string.
   */
  protected serializeProjection(schema: TObject): string {
    let attributes: string[] = [];

    for (const [key, value] of Object.entries(schema.properties)) {
      if (isProjection(value) || isTypedProjection(value)) {
        attributes.push(`${key}${this.serializeProjection(value)}`);
        continue;
      }

      if (isUnionProjection(value)) {
        attributes.push(
          `${key}${this.wrapExpansionQuery(value, `{...select(${this.serializeUnionConditions(value)})}`)}`,
        );
        continue;
      }

      if (isCollection(value)) {
        attributes.push(
          `${key}[]${this.wrapExpansionQuery(value, this.serializeProjection(value.items))}`,
        );
        continue;
      }

      attributes.push(key);
    }

    return this.wrapExpansionQuery(schema, `{${attributes.join(",")}}`);
  }

  /**
   * Serialize the given union projection to a GROQ select conditions string.
   */
  protected serializeUnionConditions(schema: TUnionProjection): string {
    let conditions: string[] = [];

    for (const projection of schema.anyOf) {
      conditions.push(
        `_type == "${projection.properties._type.const}" => ${this.serializeProjection(projection)}`,
      );
    }

    return conditions.join(",");
  }

  /**
   * Wrap the given GROQ query with an expansion if enabled.
   */
  protected wrapExpansionQuery(schema: TSchema, query: string) {
    if (!isExpandable(schema)) return query;
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
  grab<P extends TAnyProjection>(projection: P) {
    return new EntityQuery({
      ...this.payload,
      schema: projection,
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
  grab<P extends TAnyProjection>(projection: P) {
    return new ArrayQuery({
      ...this.payload,
      schema: projection,
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
   * Slice the collection.
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
