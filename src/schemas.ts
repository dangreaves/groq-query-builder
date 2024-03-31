import { Type } from "@sinclair/typebox";

import type {
  TUnion,
  TSchema,
  TObject,
  TLiteral,
  TProperties,
} from "@sinclair/typebox";

/**
 * Export useful TypeBox types.
 */
export {
  Array,
  String,
  Number,
  Object,
  Literal,
  Boolean,
  Unknown,
} from "@sinclair/typebox";

/**
 * Allow the given schema to be null.
 */
export const Nullable = <T extends TSchema>(schema: T) =>
  Type.Union([schema, Type.Null()]);

/**
 * Symbols for attaching attributes to schemas.
 */
const KindSymbol = Symbol("groq.Kind");
const AliasLiteralSymbol = Symbol("groq.AliasLiteral");
const NeedExpansionSymbol = Symbol("groq.NeedExpansion");
const ConditionalExpansionTypeSymbol = Symbol("groq.ConditionalExpansionType");

/**
 * Attach symbols to schema interface.
 */
declare module "@sinclair/typebox" {
  interface TSchema {
    [KindSymbol]?: string;
    [AliasLiteralSymbol]?: string;
    [NeedExpansionSymbol]?: boolean;
    [ConditionalExpansionTypeSymbol]?: string;
  }
}

/**
 * Return kind from the given schema.
 */
export function getKind(schema: TSchema) {
  return schema[KindSymbol];
}

/**
 * Return true if the given schema needs expansion
 */
export function needsExpansion(schema: TSchema) {
  return !!schema[NeedExpansionSymbol];
}

/**
 * Return the conditional expansion type for the given schema.
 */
export function getConditionalExpansionType(schema: TSchema) {
  return schema[ConditionalExpansionTypeSymbol];
}

/**
 * Enum of possible kind values.
 */
enum Kind {
  TypedProjection = "TypedProjection",
  UnionProjection = "UnionProjection",
}

/**
 * Alias to another attribute or literal.
 * @example {foo:"literal"}
 */
export type TAlias<T extends TSchema = TSchema> = T & {
  [AliasLiteralSymbol]: string;
};

/**
 * Create an alias.
 */
export function Alias<T extends TSchema>(
  schema: T,
  aliasLiteral: string,
): TAlias<T> {
  return {
    ...schema,
    [AliasLiteralSymbol]: aliasLiteral,
  } as TAlias<T>;
}

/**
 * Return true if this is an alias schema.
 */
export function isAlias(schema: unknown): schema is TAlias {
  return !!(schema as TSchema)[AliasLiteralSymbol];
}

/**
 * Return the alias literal from the given schema.
 */
export function getAliasLiteral(schema: TAlias) {
  return schema[AliasLiteralSymbol];
}

/**
 * Projection of attributes with the _type attribute defined.
 * @example foo{_type,title,description}
 */
export interface TTypedProjection<
  T extends TProperties & { _type: TLiteral } = TProperties & {
    _type: TLiteral<any>;
  },
> extends TObject<T> {
  [KindSymbol]: Kind.TypedProjection;
}

/**
 * Create a projection of attributes with the _type attribute defined.
 */
export function TypedProjection<
  T extends TProperties & { _type: TLiteral } = TProperties & {
    _type: TLiteral<any>;
  },
>(properties: T): TTypedProjection<T> {
  const schema = Type.Object(properties) as unknown as TTypedProjection<T>;
  schema[KindSymbol] = Kind.TypedProjection;
  return schema;
}

/**
 * Return true if this is a typed projection schema.
 */
export function isTypedProjection(schema: unknown): schema is TTypedProjection {
  return Kind.TypedProjection === (schema as TTypedProjection)[KindSymbol];
}

/**
 * Fallback schema for union projections.
 */
const unionFallbackProjection = Type.Object({
  _type: Alias(Type.Literal("unknown"), `"unknown"`),
  _rawType: Alias(Type.String(), "_type"),
});

/**
 * Projection which uses the select operator to return a union of typed projections.
 * @see https://www.sanity.io/docs/query-cheat-sheet#64a36d80be73
 * @example foo{...select(_type == "person" => {name},_type == "company" => {companyName})}
 */
export interface TUnionProjection<
  T extends TTypedProjection[] = TTypedProjection[],
> extends TUnion<[...T, typeof unionFallbackProjection]> {
  [KindSymbol]: Kind.UnionProjection;
}

/**
 * Create a union from the given typed projections.
 */
export function UnionProjection<T extends TTypedProjection[]>(projections: T) {
  const schema = Type.Union([
    ...projections,
    unionFallbackProjection,
  ]) as unknown as TUnionProjection<T>;
  schema[KindSymbol] = Kind.UnionProjection;
  return schema;
}

/**
 * Return true if this is a union projection schema.
 */
export function isUnionProjection(schema: unknown): schema is TUnionProjection {
  return Kind.UnionProjection === (schema as TUnionProjection)[KindSymbol];
}

/**
 * Enable reference expansion for the given schema.
 */
export function Expand<S extends TSchema>(schema: S): S {
  schema[NeedExpansionSymbol] = true;
  return schema;
}

/**
 * Enable conditional expansion for the given schema.
 * This will expand the schema if it matches the given type (default "reference").
 * @see https://www.sanity.io/docs/query-cheat-sheet#a1da4a3b2adc
 */
export function ConditionalExpand<S extends TSchema>(
  schema: S,
  { type = "reference" }: { type?: string } = {},
): S {
  schema[NeedExpansionSymbol] = true;
  schema[ConditionalExpansionTypeSymbol] = type;
  return schema;
}
