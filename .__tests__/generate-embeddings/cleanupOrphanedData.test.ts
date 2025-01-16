import { cleanupOrphanedData } from "@/src/main";
import { PrismaClient } from "@prisma/client";

jest.mock("@prisma/client");

const mockPrismaClient = {
  file: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  embedding: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrismaClient)),
};

(PrismaClient as jest.Mock).mockImplementation(() => mockPrismaClient);

describe("cleanupOrphanedData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("deletes orphaned files and embeddings", async () => {
    const mockMarkdownFiles = [
      { path: "file1.md", content: "", checksum: "", sections: [] },
      { path: "file2.md", content: "", checksum: "", sections: [] },
    ];
    mockPrismaClient.file.findMany.mockResolvedValue([
      { filePath: "file1.md" },
      { filePath: "file2.md" },
      { filePath: "orphaned.md" },
    ]);

    await cleanupOrphanedData(mockMarkdownFiles);

    expect(mockPrismaClient.file.deleteMany).toHaveBeenCalledWith({
      where: { filePath: { in: ["orphaned.md"] } },
    });
    expect(mockPrismaClient.embedding.deleteMany).toHaveBeenCalledWith({
      where: { filePath: { in: ["orphaned.md"] } },
    });
  });

  test("does nothing when there are no orphaned files", async () => {
    const mockMarkdownFiles = [
      { path: "file1.md", content: "", checksum: "", sections: [] },
      { path: "file2.md", content: "", checksum: "", sections: [] },
    ];
    mockPrismaClient.file.findMany.mockResolvedValue([
      { filePath: "file1.md" },
      { filePath: "file2.md" },
    ]);

    await cleanupOrphanedData(mockMarkdownFiles);

    expect(mockPrismaClient.file.deleteMany).not.toHaveBeenCalled();
    expect(mockPrismaClient.embedding.deleteMany).not.toHaveBeenCalled();
  });

  test("handles empty markdown files array", async () => {
    mockPrismaClient.file.findMany.mockResolvedValue([
      { filePath: "file1.md" },
      { filePath: "file2.md" },
    ]);

    await cleanupOrphanedData([]);

    expect(mockPrismaClient.file.deleteMany).toHaveBeenCalledWith({
      where: { filePath: { in: ["file1.md", "file2.md"] } },
    });
    expect(mockPrismaClient.embedding.deleteMany).toHaveBeenCalledWith({
      where: { filePath: { in: ["file1.md", "file2.md"] } },
    });
  });

  test("handles database error", async () => {
    mockPrismaClient.file.findMany.mockRejectedValue(
      new Error("Database error"),
    );

    await expect(cleanupOrphanedData([])).rejects.toThrow("Database error");
  });
});
