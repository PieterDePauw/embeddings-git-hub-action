import { processFile } from '@/src/main';
import { PrismaClient } from '@prisma/client';
import { embedMany } from 'ai';

jest.mock('@prisma/client');
jest.mock('ai');

const mockPrismaClient = {
  file: {
    findUnique: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  embedding: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrismaClient)),
};

(PrismaClient as jest.Mock).mockImplementation(() => mockPrismaClient);

describe('processFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handles new file correctly', async () => {
    const mockFile = {
      path: 'test.md',
      content: 'Test content',
      checksum: 'hash123',
      sections: [{ content: 'test content', heading: 'Test', slug: 'test' }],
    };
    mockPrismaClient.file.findUnique.mockResolvedValue(null);
    (embedMany as jest.Mock).mockResolvedValue({ embeddings: [[0.1, 0.2]], usage: { tokens: 5 } });

    await processFile(mockFile, 'version1', new Date());

    expect(mockPrismaClient.file.upsert).toHaveBeenCalled();
    expect(mockPrismaClient.embedding.createMany).toHaveBeenCalled();
  });

  test('handles changed file correctly', async () => {
    const mockFile = {
      path: 'test.md',
      content: 'Test content',
      checksum: 'newhash',
      sections: [{ content: 'test content', heading: 'Test', slug: 'test' }],
    };
    mockPrismaClient.file.findUnique.mockResolvedValue({ fileHash: 'oldhash' });
    (embedMany as jest.Mock).mockResolvedValue({ embeddings: [[0.1, 0.2]], usage: { tokens: 5 } });

    await processFile(mockFile, 'version1', new Date());

    expect(mockPrismaClient.embedding.deleteMany).toHaveBeenCalled();
    expect(mockPrismaClient.file.upsert).toHaveBeenCalled();
    expect(mockPrismaClient.embedding.createMany).toHaveBeenCalled();
  });

  test('handles unchanged file correctly', async () => {
    const mockFile = {
      path: 'test.md',
      content: 'Test content',
      checksum: 'hash123',
      sections: [{ content: 'test content', heading: 'Test', slug: 'test' }],
    };
    mockPrismaClient.file.findUnique.mockResolvedValue({ fileHash: 'hash123' });

    await processFile(mockFile, 'version1', new Date());

    expect(mockPrismaClient.file.update).toHaveBeenCalled();
    expect(mockPrismaClient.embedding.deleteMany).not.toHaveBeenCalled();
    expect(mockPrismaClient.embedding.createMany).not.toHaveBeenCalled();
  });

  test('handles database error', async () => {
    const mockFile = {
      path: 'test.md',
      content: 'Test content',
      checksum: 'hash123',
      sections: [{ content: 'test content', heading: 'Test', slug: 'test' }],
    };
    mockPrismaClient.file.findUnique.mockRejectedValue(new Error('Database error'));

    await expect(processFile(mockFile, 'version1', new Date())).rejects.toThrow('Database error');
  });
});

