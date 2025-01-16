import { extractMetaExport } from "@/src/markdown";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxjs } from "micromark-extension-mdxjs";
import { mdxFromMarkdown } from "mdast-util-mdx";

describe("extractMetaExport", () => {
  test("extracts meta export from MDX tree", () => {
    const mdxContent = `
export const meta = {
  title: "Test Title",
  description: "Test Description"
};

# Heading
Content
    `;

    const mdxTree = fromMarkdown(mdxContent, {
      extensions: [mdxjs()],
      mdastExtensions: [mdxFromMarkdown()],
    });

    const result = extractMetaExport(mdxTree);

    expect(result).toEqual({
      title: "Test Title",
      description: "Test Description",
    });
  });

  test("returns undefined when no meta export is found", () => {
    const mdxContent = `
# Heading
Content without meta export
    `;

    const mdxTree = fromMarkdown(mdxContent, {
      extensions: [mdxjs()],
      mdastExtensions: [mdxFromMarkdown()],
    });

    const result = extractMetaExport(mdxTree);

    expect(result).toBeUndefined();
  });

  test("handles meta export with no properties", () => {
    const mdxContent = `
export const meta = {};

# Heading
Content
    `;

    const mdxTree = fromMarkdown(mdxContent, {
      extensions: [mdxjs()],
      mdastExtensions: [mdxFromMarkdown()],
    });

    const result = extractMetaExport(mdxTree);

    expect(result).toEqual({});
  });

  test("ignores non-object meta exports", () => {
    const mdxContent = `
export const meta = "Not an object";

# Heading
Content
    `;

    const mdxTree = fromMarkdown(mdxContent, {
      extensions: [mdxjs()],
      mdastExtensions: [mdxFromMarkdown()],
    });

    const result = extractMetaExport(mdxTree);

    expect(result).toBeUndefined();
  });
});
