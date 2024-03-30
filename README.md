# Typed query builder for the Sanity GROQ query language

[![NPM Version](https://img.shields.io/npm/v/%40dangreaves%2Fgroq-query-builder)](https://www.npmjs.com/package/@dangreaves/groq-query-builder) [![NPM Downloads](https://img.shields.io/npm/dw/%40dangreaves%2Fgroq-query-builder)](https://www.npmjs.com/package/@dangreaves/groq-query-builder) [![GitHub License](https://img.shields.io/github/license/dangreaves/groq-query-builder)](./LICENCE)

This package allows queries for the [GROQ Query Language](https://www.sanity.io/docs/groq) to be constructed using a fluent interface. Because the Sanity Content Lake is technically just a JSON store, there is no guarantee that the query responses will match the Sanity schema. Therefore, this package implements runtime validation of responses using [TypeBox](https://github.com/sinclairzx81/typebox) to provide type safety.

Conceptually, it is similar to [groqd](https://github.com/FormidableLabs/groqd) but has less functionality, and uses [TypeBox](https://github.com/sinclairzx81/typebox) instead of [Zod](https://github.com/colinhacks/zod) for schema definitions. Due to the use of Zod, groqd unfortunately leads to very slow TypeScript compilation as the complexity of the Sanity schema grows.
