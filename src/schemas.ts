import { Type } from "@sinclair/typebox";

import type {
  TArray,
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
  Literal,
  Boolean,
  Unknown,
} from "@sinclair/typebox";

/**
 * Symbols for attaching attributes to schemas.
 */
const KindSymbol = Symbol("groq.Kind");
const AliasLiteralSymbol = Symbol("groq.AliasLiteral");
const NeedExpansionSymbol = Symbol("groq.NeedExpansion");
const SupportsExpansionSymbol = Symbol("groq.SupportsExpansion");
const ConditionalExpansionTypeSymbol = Symbol("groq.ConditionalExpansionType");

/**
 * Enum of possible kind values.
 */
enum Kind {
  Alias = "Alias",
  Projection = "Projection",
  TypedProjection = "TypedProjection",
  UnionProjection = "UnionProjection",
  Collection = "Collection",
}

/**
 * Alias to another attribute or literal.
 * @example {foo:"literal"}
 */
export type TAlias<T extends TSchema = TSchema> = T &
  Expandable & {
    [KindSymbol]: Kind.Alias;
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
    [KindSymbol]: Kind.Alias,
    [AliasLiteralSymbol]: aliasLiteral,
  } as TAlias<T>;
}

/**
 * Return true if this is an alias schema.
 */
export function isAlias(schema: unknown): schema is TAlias {
  return Kind.Alias === (schema as TAlias)[KindSymbol];
}

/**
 * Return the alias literal from the given alias.
 */
export function getAliasLiteral(schema: TAlias) {
  return schema[AliasLiteralSymbol];
}

/**
 * Simple projection of attributes.
 * @example foo{title,description}
 */
export interface TProjection<T extends TProperties = TProperties>
  extends TObject<T>,
    Expandable {
  [KindSymbol]: Kind.Projection;
}

/**
 * Create a projection with the given properties.
 */
export function Projection<T extends TProperties>(
  properties: T,
): TProjection<T> {
  const schema = Type.Object(properties) as TProjection<T>;
  schema[KindSymbol] = Kind.Projection;
  schema[SupportsExpansionSymbol] = true;
  return schema;
}

/**
 * Return true if this is a projection schema.
 */
export function isProjection(schema: unknown): schema is TProjection {
  return Kind.Projection === (schema as TProjection)[KindSymbol];
}

/**
 * Projection of attributes with the _type attribute defined.
 * @example foo{_type,title,description}
 */
export interface TTypedProjection<
  T extends TProperties & { _type: TLiteral } = TProperties & {
    _type: TLiteral<any>;
  },
> extends TObject<T>,
    Expandable {
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
  const schema = Projection(properties) as unknown as TTypedProjection<T>;

  schema[KindSymbol] = Kind.TypedProjection;
  schema[SupportsExpansionSymbol] = true;

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
const unionFallbackProjection = Projection({
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
> extends TUnion<[...T, typeof unionFallbackProjection]>,
    Expandable {
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
  schema[SupportsExpansionSymbol] = true;

  return schema;
}

/**
 * Return true if this is a union projection schema.
 */
export function isUnionProjection(schema: unknown): schema is TUnionProjection {
  return Kind.UnionProjection === (schema as TUnionProjection)[KindSymbol];
}

/**
 * Array of projections.
 * @example foo[]{title,description}
 */
export interface TCollection<T extends TSchema = TSchema>
  extends TArray<T>,
    Expandable {
  [KindSymbol]: Kind.Collection;
}

/**
 * Create an array of projections.
 */
export function Collection<T extends TSchema>(projection: T): TCollection<T> {
  const schema = Type.Array(projection) as TCollection<T>;
  schema[KindSymbol] = Kind.Collection;
  schema[SupportsExpansionSymbol] = true;
  return schema;
}

/**
 * Return true if this is a collection schema.
 */
export function isCollection(schema: unknown): schema is TCollection {
  return Kind.Collection === (schema as TCollection)[KindSymbol];
}

/**
 * Schema which can be expanded (de-referenced).
 */
interface Expandable {
  [SupportsExpansionSymbol]: true;
  [NeedExpansionSymbol]?: boolean;
  [ConditionalExpansionTypeSymbol]?: string;
}

/**
 * Enable reference expansion for the given schema.
 */
export function Expand<S extends Expandable>(schema: S): S {
  schema[NeedExpansionSymbol] = true;
  return schema;
}

/**
 * Enable conditional expansion for the given schema.
 * This will expand the schema if it matches the given type (default "reference").
 * @see https://www.sanity.io/docs/query-cheat-sheet#a1da4a3b2adc
 */
export function ConditionalExpand<S extends Expandable>(
  schema: S,
  { type = "reference" }: { type?: string } = {},
): S {
  schema[NeedExpansionSymbol] = true;
  schema[ConditionalExpansionTypeSymbol] = type;
  return schema;
}

/**
 * Return true if the given schema is expandable.
 */
export function isExpandable(schema: unknown): schema is Expandable {
  return !!(schema as Expandable)[SupportsExpansionSymbol];
}

/**
 * Return true if the given schema need expansion.
 */
export function needsExpansion(schema: Expandable) {
  return !!schema[NeedExpansionSymbol];
}

/**
 * Return expansion type for given expandable schema.
 */
export function getConditionalExpansionType(schema: Expandable) {
  return schema[ConditionalExpansionTypeSymbol] ?? null;
}
