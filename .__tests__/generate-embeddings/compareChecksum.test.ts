import { compareChecksum } from "@/src/main";
import { PrismaClient } from "@prisma/client";

jest.mock("@prisma/client");

const mockPrismaClient = {
  file: {
    findUnique: jest.fn(),
  },
};

(PrismaClient as jest.Mock).mockImplementation(() => mockPrismaClient);

describe("compareChecksum", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns correct result for new file", async () => {
    mockPrismaClient.file.findUnique.mockResolvedValue(null);
    const result = await compareChecksum("test.md", "hash123");
    expect(result).toEqual({ isFileFound: false, isFileChanged: null });
  });

  test("returns correct result for unchanged file", async () => {
    mockPrismaClient.file.findUnique.mockResolvedValue({ fileHash: "hash123" });
    const result = await compareChecksum("test.md", "hash123");
    expect(result).toEqual({ isFileFound: true, isFileChanged: false });
  });

  test("returns correct result for changed file", async () => {
    mockPrismaClient.file.findUnique.mockResolvedValue({ fileHash: "oldhash" });
    const result = await compareChecksum("test.md", "newhash");
    expect(result).toEqual({ isFileFound: true, isFileChanged: true });
  });

  test("handles database error", async () => {
    mockPrismaClient.file.findUnique.mockRejectedValue(
      new Error("Database error"),
    );
    await expect(compareChecksum("test.md", "hash123")).rejects.toThrow(
      "Database error",
    );
  });
});
