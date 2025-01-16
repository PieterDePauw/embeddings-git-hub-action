import { processSections } from "@/src/markdown";
import { fromMarkdown } from "mdast-util-from-markdown";

describe("processSections", () => {
  test("processes sections from MDX tree", () => {
    const mdxContent = `
# Heading 1
Content 1

# Heading 2 [#custom-anchor]
Content 2

## Subheading
Content 3
    `;

    const mdxTree = fromMarkdown(mdxContent);
    const result = processSections(mdxTree);

    expect(result).toHaveLength(2);
    expect(result[0].heading).toBe("Heading 1");
    expect(result[0].slug).toBe("heading-1");
    expect(result[1].heading).toBe("Heading 2");
    expect(result[1].slug).toBe("custom-anchor");
  });

  test("handles empty tree", () => {
    const mdxTree = fromMarkdown("");
    const result = processSections(mdxTree);

    expect(result).toHaveLength(0);
  });

  test("handles tree with no headings", () => {
    const mdxContent = `
This is a paragraph.

This is another paragraph.
    `;

    const mdxTree = fromMarkdown(mdxContent);
    const result = processSections(mdxTree);

    expect(result).toHaveLength(1);
    expect(result[0].heading).toBe("");
    expect(result[0].slug).toBe("");
    expect(result[0].content).toBe(mdxContent.trim());
  });

  test("generates unique slugs for duplicate headings", () => {
    const mdxContent = `
# Heading
Content 1

# Heading
Content 2

# Heading
Content 3
    `;

    const mdxTree = fromMarkdown(mdxContent);
    const result = processSections(mdxTree);

    expect(result).toHaveLength(3);
    expect(result[0].slug).toBe("heading");
    expect(result[1].slug).toBe("heading-1");
    expect(result[2].slug).toBe("heading-2");
  });
});
