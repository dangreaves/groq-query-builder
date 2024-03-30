import { expect, test, describe } from "vitest";

import * as Schemas from "./schemas";

import { filterByType } from "./query";

describe("grab", () => {
  test("grab simple projection", () => {
    const query = filterByType("movie").grab(
      Schemas.Projection({
        title: Schemas.String(),
        description: Schemas.String(),
      }),
    );

    expect(query.serialize()).toBe(`*[_type == "movie"][]{title,description}`);
  });

  test("grab nested projection", () => {
    const query = filterByType("movie").grab(
      Schemas.Projection({
        title: Schemas.String(),
        description: Schemas.String(),
        metadata: Schemas.Projection({
          keywords: Schemas.String(),
          isReleased: Schemas.Boolean(),
        }),
      }),
    );

    expect(query.serialize()).toBe(
      `*[_type == "movie"][]{title,description,metadata{keywords,isReleased}}`,
    );
  });

  test("grab nested reference", () => {
    const query = filterByType("movie").grab(
      Schemas.Projection({
        title: Schemas.String(),
        description: Schemas.String(),
        metadata: Schemas.Projection({
          keywords: Schemas.String(),
          isReleased: Schemas.Boolean(),
        }),
        author: Schemas.Expand(
          Schemas.Projection({
            name: Schemas.String(),
          }),
        ),
      }),
    );

    expect(query.serialize()).toBe(
      `*[_type == "movie"][]{title,description,metadata{keywords,isReleased},author->{name}}`,
    );
  });

  test("grab nested collection", () => {
    const query = filterByType("movie").grab(
      Schemas.Projection({
        title: Schemas.String(),
        description: Schemas.String(),
        categories: Schemas.Collection({
          name: Schemas.String(),
        }),
      }),
    );

    expect(query.serialize()).toBe(
      `*[_type == "movie"][]{title,description,categories[]{name}}`,
    );
  });

  test("grab nested reference collection", () => {
    const query = filterByType("movie").grab(
      Schemas.Projection({
        title: Schemas.String(),
        description: Schemas.String(),
        categories: Schemas.Expand(
          Schemas.Collection({
            name: Schemas.String(),
          }),
        ),
      }),
    );

    expect(query.serialize()).toBe(
      `*[_type == "movie"][]{title,description,categories[]->{name}}`,
    );
  });

  test.skip("grab union projection", () => {
    const query = filterByType("movie").grab(
      Schemas.Projection({
        producer: Schemas.UnionProjection([
          Schemas.TypedProjection({
            _type: Schemas.Literal("person"),
            name: Schemas.String(),
          }),
          Schemas.TypedProjection({
            _type: Schemas.Literal("company"),
            companyName: Schemas.String(),
          }),
        ]),
      }),
    );

    expect(query.serialize()).toBe(
      `*[_type == "movie"][]{producer{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName},{"_type":"unknown","_rawType":_type})}}`,
    );
  });

  test.skip("grab expanded union projection", () => {
    const query = filterByType("movie").grab(
      Schemas.Projection({
        producer: Schemas.Expand(
          Schemas.UnionProjection([
            Schemas.TypedProjection({
              _type: Schemas.Literal("person"),
              name: Schemas.String(),
            }),
            Schemas.TypedProjection({
              _type: Schemas.Literal("company"),
              companyName: Schemas.String(),
            }),
          ]),
        ),
      }),
    );

    expect(query.serialize()).toBe(
      `*[_type == "movie"][]{producer->{...select(_type == "person" => {_type,name},_type == "company" => {_type,companyName})}}`,
    );
  });

  test("grab conditional expanded projection", () => {
    const query = filterByType("movie").grab(
      Schemas.ConditionalExpand(
        Schemas.TypedProjection({
          _type: Schemas.Literal("person"),
          name: Schemas.String(),
        }),
      ),
    );

    expect(query.serialize()).toBe(
      `*[_type == "movie"][]{_type == "reference" => @->{_type,name},_type != "reference" => @{_type,name}}`,
    );
  });

  test("grab conditional expanded projection with custom type", () => {
    const query = filterByType("movie").grab(
      Schemas.ConditionalExpand(
        Schemas.TypedProjection({
          _type: Schemas.Literal("person"),
          name: Schemas.String(),
        }),
        { type: "customReference" },
      ),
    );

    expect(query.serialize()).toBe(
      `*[_type == "movie"][]{_type == "customReference" => @->{_type,name},_type != "customReference" => @{_type,name}}`,
    );
  });
});

describe("slice", () => {
  test("slice a single entity", () => {
    const query = filterByType("movie").slice(0);
    expect(query.serialize()).toBe(`*[_type == "movie"][0]`);
  });

  test("slice a group of entities", () => {
    const query = filterByType("movie").slice(0, 2);
    expect(query.serialize()).toBe(`*[_type == "movie"][0...2]`);
  });
});

describe("filter", () => {
  test("filter by type", () => {
    const query = filterByType("movie");

    expect(query.serialize()).toBe(`*[_type == "movie"][]`);
  });

  test("filter by type with additional filter", () => {
    const query = filterByType("movie", `genre == "comedy"`);

    expect(query.serialize()).toBe(
      `*[_type == "movie" && genre == "comedy"][]`,
    );
  });

  test("add filter condition", () => {
    const query = filterByType("movie")
      .filter(`genre == "comedy"`)
      .grab(
        Schemas.Projection({
          title: Schemas.String(),
          description: Schemas.String(),
        }),
      );

    expect(query.serialize()).toBe(
      `*[_type == "movie"][genre == "comedy"][]{title,description}`,
    );
  });
});
