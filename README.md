> [!WARNING]
>
> **I am no longer maintaining this package.**
>
> - The official [Sanity TypeGen](https://www.sanity.io/docs/sanity-typegen) package continues to improve, and is the likely future for using TypeScript with Sanity.
> - The GROQ query language is complex, such that serializing it with a "builder" is challenging. I don't think you can truly utilise GROQ without writing your queries as a giant string.
> - The official [groq](https://github.com/sanity-io/sanity/tree/next/packages/groq) package has a `defineQuery` helper, which I hope will get smarter in the future, much like GraphQL tooling has evolved to work with strings.
> - Though TypeBox was a big improvement over Zod, type inference is too slow in TypeScript right now, such that inferring schema definitions on the fly becomes prohibitively slow as complexity increases.
> - Sanity TypeGen generates static types at build time from the schema files. This has the limitation that the types are not guaranteed to match the GROQ response, and there is no runtime validation. However, because it emits simple types, it's much faster to analyse. I believe that the improved developer experience is worth the small risk that content lake data could drift.
> - Potentially, tools could be developed that regularly "scan" the content lake for data which no longer matches the expected schemas, eliminating this risk, or Sanity develops some sort of content lake schema, which is not bound to the studio.

# groq-query-builder

[![NPM Version](https://img.shields.io/npm/v/%40dangreaves%2Fgroq-query-builder)](https://npmjs.com/@dangreaves/groq-query-builder)
![NPM License](https://img.shields.io/npm/l/%40dangreaves%2Fgroq-query-builder)
![NPM Downloads](https://img.shields.io/npm/dm/%40dangreaves%2Fgroq-query-builder)

Build fully typed [GROQ](https://www.sanity.io/docs/groq) queries with runtime validation using [TypeBox](https://github.com/sinclairzx81/typebox).

## Example

This package allows you to build GROQ queries using [TypeBox](https://github.com/sinclairzx81/typebox) schemas.

TypeBox is high-performance runtime validation package, which allows you to define "schemas" which can be runtime validated, and inferred as TypeScript types.

```ts
import { Type } from "@sinclair/typebox";
import { createClient } from "@sanity/client";

import {
  makeQueryClient,
  TypedProjection,
  InferFromSchema,
  filterProjection,
} from "@dangreaves/groq-query-builder";

// Get a Sanity client like usual.
const client = createClient({
  /** ... */
});

// Make a "safe" client which accepts a schema as the query, and will runtime validate responses.
const queryClient = makeQueryClient((...args) => client.fetch(...args));

// Define a projection schema for the product.
const ProductSchema = TypedProjection({
  _type: Type.Literal("product"),
  title: Type.String(),
  price: Type.Number(),
  description: Type.String(),
});

// Optionally infer a type from the schema.
type ProductType = InferFromSchema<typeof ProductSchema>;

// Filter the projection using a GROQ string.
const query = filterProjection(
  ProductSchema,
  `"product" == _type && "tshirt" == handle`,
);

// Send Sanity the query, and receive a fully typed and validated response.
const products = await queryClient(query);
```

## Motivation

[Sanity CMS](https://www.sanity.io) is a content management system consisting of two parts: [Sanity Studio](https://www.sanity.io/docs/sanity-studio) and [Content Lake](https://www.sanity.io/docs/datastore).

- Sanity Studio is a self-hostable GUI for content editors. It validates that data entered by editors matches the [Sanity Schema](https://www.sanity.io/docs/schemas-and-forms) before posting it to the Content Lake.
- Content Lake is essentially a giant JSON database hosted by Sanity. It has no concept of a schema.

### Fetching data from Sanity

To get data out of Sanity, you will likely use [GROQ](https://www.sanity.io/docs/groq), a query language designed to filter, slice and project the JSON data contained in the Content Lake.

A GROQ query might look like this...

```groq
*["product" == _type && "tshirt" == handle]{title,price,description}
```

Using the [@sanity/client](https://www.sanity.io/docs/js-client) package, you might send it like this...

```ts
import { createClient } from "@sanity/client";

const client = createClient({
  /** ... */
});

const product = await client.fetch(
  '*["product" == _type && "tshirt" == handle]{title,price,description}',
);
```

This works fine for small projects, but it has the following problems.

1. The `product` variable is untyped, we don't know what shape the data will come out as.
2. The query itself is just a string. There are [heaps of things](https://www.sanity.io/docs/query-cheat-sheet) which GROQ can do, leading to sharp increase in query complexity. Managing it as a string quickly becomes painful.

### Sanity TypeGen

For the lack of types, there is an offical solution: [Sanity TypeGen](https://www.sanity.io/docs/sanity-typegen).

- This tool works by converting your Sanity schema into TypeScript types.
- From your GROQ query strings, it is able to infer an expected response type.

👍 For the vast majority of users, this is enough, and I recommend you go and use it.

👎 However, the limitations of Sanity TypeGen are...

1. **The types are inferred from your Sanity schema.**<br />There is no guarantee that the data in the Content Lake actually adheres to this schema. If you create data using one schema, and then change the schema, then the underlying data will not change. Therefore, it's posible to receive data in the query response which does not match the inferred type.
2. **Complex Sanity schemas may break the tool.**<br />Some users have very complicated Sanity schemas, with recursive references, union types and other complexities. The Sanity TypeGen tool may struggle to create TypeScript types from these schemas. In these cases, it's often better to type the GROQ query, rather than the underlying schema.
3. **GROQ queries still written as a string.**<br />With this tool, you still write your GROQ queries as a string. This works for small queries, but when you get into the realm of deep expanding references, recursive objects and other complexities, managing the query as a string becomes very difficult.
4. **No runtime validation.**<br />This tool will only generate types at build time. There is no runtime validation that checks the data coming out of Sanity actually matches the type.

### groqd

The [groqd](https://github.com/FormidableLabs/groqd) package addresses all of these limitations.

It allows you to write a GROQ query using a fluent interface complete with an expected response schema based on [Zod](https://github.com/colinhacks/zod). This schema is used to runtime validate the response from Sanity, and throw an error if the response does not match the expected schema. Becuase the query is constructed with a Zod schema, the response type can be inferred, and completely trusted.

Here is that same GROQ example, but with groqd...

```ts
import { q } from "groqd";
import { createClient } from "@sanity/client";

const client = createClient({
  /** ... */
});

const { query, schema } = q("*")
  .filter(`"product" == _type && "tshirt" == handle`)
  .grabOne({
    title: q.string(),
    price: q.number(),
    description: q.string(),
  });

// Product is fully typed as { title: string; price: number; description: string; }
const product = schema.parse(await client.fetch(query));
```

👎 The limitation for groqd is that due to it's use of [Zod](https://github.com/colinhacks/zod), it gets slower and slower the more complex your schema becomes. In my own case, when my schema in groqd ended up as a few hundred deeply nested entities, TypeScript simply could not keep up with the type generation. There is an issue (https://github.com/FormidableLabs/groqd/issues/261) which addresses this.
