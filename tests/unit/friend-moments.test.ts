import { describe, expect, it } from "vitest";

import { filterFriendArticles, type FriendArticle } from "../../src/js/features/friend-moments";

function article(author: string, title: string, day: number): FriendArticle {
  return {
    id: title,
    author,
    authorUrl: "",
    title,
    description: "",
    postLink: "",
    logo: "",
    pubDate: new Date(2026, 0, day),
    creationTime: new Date(2026, 0, day),
    content: `${author} ${title}`.toLowerCase(),
  };
}

describe("friend moments filtering", () => {
  const articles = [article("Beta", "Second", 2), article("Alpha", "First", 1)];

  it("filters by author and keyword", () => {
    expect(
      filterFriendArticles(articles, {
        author: "Alpha",
        keyword: "first",
        sortField: "pubDate",
        sortOrder: "desc",
      }).map((item) => item.title),
    ).toEqual(["First"]);
  });

  it("sorts date and text fields deterministically", () => {
    expect(
      filterFriendArticles(articles, {
        author: "",
        keyword: "",
        sortField: "author",
        sortOrder: "asc",
      }).map((item) => item.author),
    ).toEqual(["Alpha", "Beta"]);
  });
});
