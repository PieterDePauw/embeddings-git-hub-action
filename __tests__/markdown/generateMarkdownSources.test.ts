import fs from "fs/promises";
import path from "path";
import { generateMarkdownSources } from "@/src/markdown";

jest.mock("fs/promises");

describe("generateMarkdownSources", () => {
  beforeEach(() => {
    (fs.readdir as jest.Mock).mockReset();
    (fs.stat as jest.Mock).mockReset();
    (fs.readFile as jest.Mock).mockReset();
  });

  test("generates markdown sources", async () => {
    (fs.readdir as jest.Mock).mockResolvedValueOnce([
      "file1.md",
      "file2.mdx",
      "ignored.md",
    ]);
    (fs.stat as jest.Mock)
      .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true })
      .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true })
      .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true });
    (fs.readFile as jest.Mock)
      .mockResolvedValueOnce("# File 1\nContent 1")
      .mockResolvedValueOnce("# File 2\nContent 2");

    const result = await generateMarkdownSources({
      docsRootPath: "/test",
      ignoredFiles: ["ignored.md"],
    });

    expect(result).toHaveLength(2);
    expect(result[0].path).toBe("/test/file1.md");
    expect(result[1].path).toBe("/test/file2.mdx");
  });

  test("handles empty directory", async () => {
    (fs.readdir as jest.Mock).mockResolvedValueOnce([]);

    const result = await generateMarkdownSources({
      docsRootPath: "/empty",
      ignoredFiles: [],
    });

    expect(result).toHaveLength(0);
  });

  test("ignores specified files", async () => {
    (fs.readdir as jest.Mock).mockResolvedValueOnce(["file1.md", "ignored.md"]);
    (fs.stat as jest.Mock)
      .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true })
      .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true });
    (fs.readFile as jest.Mock).mockResolvedValueOnce("# File 1\nContent 1");

    const result = await generateMarkdownSources({
      docsRootPath: "/test",
      ignoredFiles: ["ignored.md"],
    });

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("/test/file1.md");
  });

  test("processes MDX files with meta exports", async () => {
    (fs.readdir as jest.Mock).mockResolvedValueOnce(["file.mdx"]);
    (fs.stat as jest.Mock).mockResolvedValueOnce({
      isDirectory: () => false,
      isFile: () => true,
    });
    (fs.readFile as jest.Mock).mockResolvedValueOnce(`
export const meta = {
  title: "Test Title",
  description: "Test Description"
};

# Heading
Content
      `);

    const result = await generateMarkdownSources({
      docsRootPath: "/test",
      ignoredFiles: [],
    });

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("/test/file.mdx");
    expect(result[0].meta).toEqual({
      title: "Test Title",
      description: "Test Description",
    });
  });
});
