import {
  walk,
  parseHeading,
  processSections,
  generateMarkdownSources,
} from "@/src/markdown";
import fs from "fs/promises";
import path from "path";
import { fromMarkdown } from "mdast-util-from-markdown";

jest.mock("fs/promises");

describe("markdown module", () => {
  describe("walk", () => {
    // Existing walk tests...
  });

  describe("parseHeading", () => {
    // Existing parseHeading tests...
  });

  describe("processSections", () => {
    // Existing processSections tests...
  });

  describe("generateMarkdownSources", () => {
    beforeEach(() => {
      (fs.readdir as jest.Mock).mockReset();
      (fs.stat as jest.Mock).mockReset();
      (fs.readFile as jest.Mock).mockReset();
    });

    it("should generate markdown sources correctly", async () => {
      (fs.readdir as jest.Mock).mockResolvedValueOnce([
        "file1.md",
        "file2.mdx",
      ]);
      (fs.stat as jest.Mock)
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true })
        .mockResolvedValueOnce({
          isDirectory: () => false,
          isFile: () => true,
        });
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce("# File 1\nContent 1")
        .mockResolvedValueOnce("# File 2\nContent 2");

      const result = await generateMarkdownSources({
        docsRootPath: "/test",
        ignoredFiles: [],
      });

      expect(result).toHaveLength(2);
      expect(result[0].path).toBe("/test/file1.md");
      expect(result[1].path).toBe("/test/file2.mdx");
    });

    it("should ignore specified files", async () => {
      (fs.readdir as jest.Mock).mockResolvedValueOnce([
        "file1.md",
        "ignored.md",
      ]);
      (fs.stat as jest.Mock)
        .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true })
        .mockResolvedValueOnce({
          isDirectory: () => false,
          isFile: () => true,
        });
      (fs.readFile as jest.Mock).mockResolvedValueOnce("# File 1\nContent 1");

      const result = await generateMarkdownSources({
        docsRootPath: "/test",
        ignoredFiles: ["ignored.md"],
      });

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe("/test/file1.md");
    });

    it("should handle empty directories", async () => {
      (fs.readdir as jest.Mock).mockResolvedValueOnce([]);

      const result = await generateMarkdownSources({
        docsRootPath: "/empty",
        ignoredFiles: [],
      });

      expect(result).toHaveLength(0);
    });
  });
});
