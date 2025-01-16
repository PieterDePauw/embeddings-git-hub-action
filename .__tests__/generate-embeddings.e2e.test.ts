import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { run } from "@/src/main";
import { DOCS_ROOT_PATH } from "@/src/config";
import * as core from "@actions/core";
import { generateMarkdownSources } from "@/src/markdown";

const prisma = new PrismaClient();

jest.mock("@actions/core");

describe("Embedding Generation E2E", () => {
  const testDocsPath = path.join(__dirname, "..", "docs");

  beforeAll(async () => {
    // Ensure the test documents exist
    const files = ["getting-started.md", "api-docs.md", "troubleshooting.md"];
    for (const file of files) {
      const filePath = path.join(testDocsPath, file);
      try {
        await fs.access(filePath);
      } catch (error) {
        throw new Error(
          `Test file ${file} does not exist. Please ensure all test documents are present in the docs directory.`,
        );
      }
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("run processes all markdown files and generates embeddings", async () => {
    process.env.INPUT_DOCS_ROOT_PATH = testDocsPath;
    process.env.INPUT_SHOULD_REFRESH = "false";
    (core.getInput as jest.Mock).mockImplementation((name) => {
      if (name === "docs-root-path") return testDocsPath;
      if (name === "should-refresh") return "false";
      return "";
    });

    await run();

    // Check if files were processed
    const files = await prisma.file.findMany();
    expect(files).toHaveLength(3);
    expect(files.map((f) => f.filePath)).toEqual(
      expect.arrayContaining([
        "getting-started.md",
        "api-docs.md",
        "troubleshooting.md",
      ]),
    );

    // Check if embeddings were generated
    const embeddings = await prisma.embedding.findMany();
    expect(embeddings.length).toBeGreaterThan(0);

    // Check if embeddings are associated with the correct files
    const embeddingsForGettingStarted = embeddings.filter((e) =>
      e.filePath.includes("getting-started.md"),
    );
    const embeddingsForApiDocs = embeddings.filter((e) =>
      e.filePath.includes("api-docs.md"),
    );
    const embeddingsForTroubleshooting = embeddings.filter((e) =>
      e.filePath.includes("troubleshooting.md"),
    );

    expect(embeddingsForGettingStarted.length).toBeGreaterThan(0);
    expect(embeddingsForApiDocs.length).toBeGreaterThan(0);
    expect(embeddingsForTroubleshooting.length).toBeGreaterThan(0);
  });

  test("run refreshes all embeddings when shouldRefresh is true", async () => {
    process.env.INPUT_DOCS_ROOT_PATH = testDocsPath;
    process.env.INPUT_SHOULD_REFRESH = "true";
    (core.getInput as jest.Mock).mockImplementation((name) => {
      if (name === "docs-root-path") return testDocsPath;
      if (name === "should-refresh") return "true";
      return "";
    });

    // Run once to populate the database
    await run();

    // Get the initial count of embeddings
    const initialEmbeddingsCount = await prisma.embedding.count();

    // Modify a file to simulate a change
    const testFilePath = path.join(testDocsPath, "getting-started.md");
    const originalContent = await fs.readFile(testFilePath, "utf-8");
    await fs.writeFile(
      testFilePath,
      originalContent +
        "\n\n## New Section\n\nThis is a new section added for testing.",
    );

    // Run again with shouldRefresh = true
    await run();

    // Check if the number of embeddings has increased
    const finalEmbeddingsCount = await prisma.embedding.count();
    expect(finalEmbeddingsCount).toBeGreaterThan(initialEmbeddingsCount);

    // Check if the refresh timestamps are updated
    const files = await prisma.file.findMany();
    const uniqueRefreshDates = new Set(
      files.map((f) => f.latestRefresh.getTime()),
    );
    expect(uniqueRefreshDates.size).toBe(1); // All files should have the same refresh timestamp

    // Restore the original content of the modified file
    await fs.writeFile(testFilePath, originalContent);
  });

  test("run handles file deletions correctly", async () => {
    process.env.INPUT_DOCS_ROOT_PATH = testDocsPath;
    process.env.INPUT_SHOULD_REFRESH = "false";
    (core.getInput as jest.Mock).mockImplementation((name) => {
      if (name === "docs-root-path") return testDocsPath;
      if (name === "should-refresh") return "false";
      return "";
    });

    // Run once to populate the database
    await run();

    // Create a temporary file
    const tempFilePath = path.join(testDocsPath, "temp-file.md");
    await fs.writeFile(
      tempFilePath,
      "# Temporary File\n\nThis file will be deleted.",
    );

    // Run again to process the new file
    await run();

    // Verify the temporary file was processed
    let tempFile = await prisma.file.findUnique({
      where: { filePath: "temp-file.md" },
    });
    expect(tempFile).not.toBeNull();

    // Delete the temporary file
    await fs.unlink(tempFilePath);

    // Run again
    await run();

    // Check if the file and its embeddings were removed from the database
    tempFile = await prisma.file.findUnique({
      where: { filePath: "temp-file.md" },
    });
    expect(tempFile).toBeNull();

    const deletedEmbeddings = await prisma.embedding.findMany({
      where: { filePath: "temp-file.md" },
    });
    expect(deletedEmbeddings).toHaveLength(0);
  });
});
