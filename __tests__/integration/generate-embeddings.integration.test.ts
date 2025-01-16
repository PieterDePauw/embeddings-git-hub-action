import { PrismaClient } from '@prisma/client';
import { run } from '@/src/main';
import { generateMarkdownSources } from '@/src/markdown';
import * as core from '@actions/core';
import fs from 'fs/promises';
import path from 'path';

jest.mock('@actions/core');
jest.mock('@/src/markdown');

const prisma = new PrismaClient();

describe('Generate Embeddings Integration', () => {
  const testDocsPath = path.join(__dirname, 'test-docs');

  beforeAll(async () => {
    await fs.mkdir(testDocsPath, { recursive: true });
    await fs.writeFile(path.join(testDocsPath, 'test1.md'), '# Test 1\nThis is a test document.');
    await fs.writeFile(path.join(testDocsPath, 'test2.md'), '# Test 2\nThis is another test document.');
  });

  afterAll(async () => {
    await fs.rm(testDocsPath, { recursive: true, force: true });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate embeddings for markdown files', async () => {
    (core.getInput as jest.Mock).mockImplementation((name) => {
      if (name === 'docs-root-path') return testDocsPath;
      if (name === 'should-refresh') return 'false';
      return '';
    });

    (generateMarkdownSources as jest.Mock).mockResolvedValue([
      { path: 'test1.md', content: '# Test 1\nThis is a test document.', checksum: 'hash1', sections: [{ heading: 'Test 1', content: 'This is a test document.', slug: 'test-1' }] },
      { path: 'test2.md', content: '# Test 2\nThis is another test document.', checksum: 'hash2', sections: [{ heading: 'Test 2', content: 'This is another test document.', slug: 'test-2' }] },
    ]);

    await run();

    const files = await prisma.file.findMany();
    expect(files).toHaveLength(2);

    const embeddings = await prisma.embedding.findMany();
    expect(embeddings.length).toBeGreaterThan(0);

    expect(core.info).toHaveBeenCalledWith('Embedding generation completed successfully');
  });
});

