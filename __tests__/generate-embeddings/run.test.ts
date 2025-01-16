import { run } from '@/src/main';
import * as core from '@actions/core';
import { PrismaClient } from '@prisma/client';
import { generateMarkdownSources } from '@/src/markdown';
import { SingleBar } from 'cli-progress';

jest.mock('@actions/core');
jest.mock('@prisma/client');
jest.mock('@/src/markdown');
jest.mock('cli-progress');

const mockPrismaClient = {
  file: {
    deleteMany: jest.fn(),
    upsert: jest.fn(),
  },
  embedding: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrismaClient)),
  $disconnect: jest.fn(),
};

(PrismaClient as jest.Mock).mockImplementation(() => mockPrismaClient);

describe('run', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (core.getInput as jest.Mock).mockImplementation((name) => {
      if (name === 'docs-root-path') return 'docs/';
      if (name === 'should-refresh') return 'false';
      return '';
    });
    (generateMarkdownSources as jest.Mock).mockResolvedValue([
      { path: 'file1.md', content: 'content1', checksum: 'hash1', sections: [] },
      { path: 'file2.md', content: 'content2', checksum: 'hash2', sections: [] },
    ]);
  });

  test('processes files correctly', async () => {
    await run();

    expect(generateMarkdownSources).toHaveBeenCalled();
    expect(mockPrismaClient.file.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrismaClient.embedding.createMany).toHaveBeenCalledTimes(2);
    expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith('Embedding generation completed successfully');
  });

  test('refreshes all embeddings when shouldRefresh is true', async () => {
    (core.getInput as jest.Mock).mockImplementation((name) => {
      if (name === 'docs-root-path') return 'docs/';
      if (name === 'should-refresh') return 'true';
      return '';
    });

    await run();

    expect(mockPrismaClient.$transaction).toHaveBeenCalledWith([
      expect.any(Function),
      expect.any(Function),
    ]);
    expect(core.info).toHaveBeenCalledWith('Refreshing all embeddings');
  });

  test('handles errors correctly', async () => {
    const mockError = new Error('Test error');
    (generateMarkdownSources as jest.Mock).mockRejectedValue(mockError);

    await run();

    expect(core.setFailed).toHaveBeenCalledWith(`Error: ${mockError.message}`);
    expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
  });

  test('uses custom docs root path', async () => {
    (core.getInput as jest.Mock).mockImplementation((name) => {
      if (name === 'docs-root-path') return 'custom/docs/';
      if (name === 'should-refresh') return 'false';
      return '';
    });

    await run();

    expect(generateMarkdownSources).toHaveBeenCalledWith(expect.objectContaining({
      docsRootPath: 'custom/docs/',
    }));
  });

  test('creates and updates progress bar', async () => {
    const mockStart = jest.fn();
    const mockIncrement = jest.fn();
    const mockStop = jest.fn();

    (SingleBar as jest.Mock).mockImplementation(() => ({
      start: mockStart,
      increment: mockIncrement,
      stop: mockStop,
    }));

    await run();

    expect(mockStart).toHaveBeenCalled();
    expect(mockIncrement).toHaveBeenCalledTimes(2); // Once for each file
    expect(mockStop).toHaveBeenCalled();
  });
});

