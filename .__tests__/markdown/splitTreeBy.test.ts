import { splitTreeBy } from "@/src/markdown";
import { fromMarkdown } from "mdast-util-from-markdown";

describe("splitTreeBy", () => {
  test("splits tree by predicate", () => {
    const tree = fromMarkdown(`
# Heading 1
Content 1

# Heading 2
Content 2

## Subheading
Content 3
    `);

    const result = splitTreeBy(
      tree,
      (node) => node.type === "heading" && node.depth === 1,
    );

    expect(result).toHaveLength(2);
    expect(result[0].children[0].type).toBe("heading");
    expect(result[0].children[0].depth).toBe(1);
    expect(result[1].children[0].type).toBe("heading");
    expect(result[1].children[0].depth).toBe(1);
  });

  test("handles tree with no matching nodes", () => {
    const tree = fromMarkdown(`
## Subheading 1
Content 1

## Subheading 2
Content 2
    `);

    const result = splitTreeBy(
      tree,
      (node) => node.type === "heading" && node.depth === 1,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(tree);
  });

  test("handles empty tree", () => {
    const tree = fromMarkdown("");

    const result = splitTreeBy(tree, () => true);

    expect(result).toHaveLength(0);
  });

  test("splits tree with multiple matching nodes in a row", () => {
    const tree = fromMarkdown(`
# Heading 1
# Heading 2
Content
# Heading 3
    `);

    const result = splitTreeBy(
      tree,
      (node) => node.type === "heading" && node.depth === 1,
    );

    expect(result).toHaveLength(3);
    expect(result[0].children[0].type).toBe("heading");
    expect(result[1].children[0].type).toBe("heading");
    expect(result[2].children[0].type).toBe("heading");
  });
});
