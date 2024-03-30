import { Type, TypeGuard } from "@sinclair/typebox";

import type { TObject, TSchema, TArray } from "@sinclair/typebox";

import {
  Projection,
  isProjection,
  isExpandable,
  isCollection,
  needsExpansion,
  TUnionProjection,
  isTypedProjection,
  isUnionProjection,
  getConditionalExpansionType,
} from "./schemas";

import type { Selection, InferSchemaFromSelection } from "./types";

export type Slice = { from: number; to?: number | undefined };
export type ConditionGroup = { mode: "&&" | "||"; conditions: Condition[] };
export type Condition = { key: string; operator: "==" | "!="; value: string };

export type QueryPayload<T extends TSchema> = {
  schema: T;
  slice?: Slice;
  conditionGroups?: ConditionGroup[];
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

    // Append filter conditions.
    if (
      this.payload.conditionGroups &&
      0 < this.payload.conditionGroups.length
    ) {
      for (const conditionGroup of this.payload.conditionGroups) {
        query.push(
          `[${conditionGroup.conditions.map(({ key, operator, value }) => `${key} ${operator} ${JSON.stringify(value)}`).join(conditionGroup.mode)}]`,
        );
      }
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
  grab<S extends Selection>(selection: S) {
    // If passed a raw object, wrap in a projection schema.
    const schema = (
      TypeGuard.IsSchema(selection) ? selection : Projection(selection)
    ) as InferSchemaFromSelection<S>;

    return new EntityQuery({
      ...this.payload,
      schema,
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
  grab<S extends Selection>(selection: S) {
    // If passed a raw object, wrap in a projection schema.
    const schema = (
      TypeGuard.IsSchema(selection) ? selection : Projection(selection)
    ) as InferSchemaFromSelection<S>;

    return new ArrayQuery({
      ...this.payload,
      schema,
    });
  }

  slice(from: Slice["from"], to?: Slice["to"]) {
    return new EntityQuery({
      ...this.payload,
      slice: { from, to },
    });
  }

  first() {
    return this.slice(0);
  }
}

/**
 * Construct an array query filtered by document type.
 */
export function filterByType(type: string) {
  return new ArrayQuery({
    schema: Type.Unknown(),
    conditionGroups: [
      {
        mode: "&&",
        conditions: [{ key: "_type", operator: "==", value: type }],
      },
    ],
  });
}
