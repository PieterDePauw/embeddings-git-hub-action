import fs from 'fs/promises';
import path from 'path';
import { walk } from '@/src/markdown';

jest.mock('fs/promises');

describe('walk', () => {
  beforeEach(() => {
    (fs.readdir as jest.Mock).mockReset();
    (fs.stat as jest.Mock).mockReset();
  });

  test('walks directory and returns file list', async () => {
    (fs.readdir as jest.Mock).mockResolvedValueOnce(['file1.md', 'file2.mdx', 'subdir']);
    (fs.stat as jest.Mock)
      .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true })
      .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true })
      .mockResolvedValueOnce({ isDirectory: () => true, isFile: () => false });
    (fs.readdir as jest.Mock).mockResolvedValueOnce(['file3.md']);
    (fs.stat as jest.Mock).mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true });

    const result = await walk('/test');

    expect(result).toEqual([
      { path: '/test/file1.md', parentPath: undefined },
      { path: '/test/file2.mdx', parentPath: undefined },
      { path: '/test/subdir/file3.md', parentPath: undefined }
    ]);
  });

  test('handles empty directory', async () => {
    (fs.readdir as jest.Mock).mockResolvedValueOnce([]);

    const result = await walk('/empty');

    expect(result).toEqual([]);
  });

  test('handles nested directories', async () => {
    (fs.readdir as jest.Mock)
      .mockResolvedValueOnce(['dir1', 'file1.md'])
      .mockResolvedValueOnce(['dir2', 'file2.md'])
      .mockResolvedValueOnce(['file3.md']);
    
    (fs.stat as jest.Mock)
      .mockResolvedValueOnce({ isDirectory: () => true, isFile: () => false })
      .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true })
      .mockResolvedValueOnce({ isDirectory: () => true, isFile: () => false })
      .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true })
      .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true });

    const result = await walk('/nested');

    expect(result).toEqual([
      { path: '/nested/file1.md', parentPath: undefined },
      { path: '/nested/dir1/file2.md', parentPath: undefined },
      { path: '/nested/dir1/dir2/file3.md', parentPath: undefined }
    ]);
  });

  test('handles files with same name as directory', async () => {
    (fs.readdir as jest.Mock)
      .mockResolvedValueOnce(['dir.mdx', 'dir'])
      .mockResolvedValueOnce(['file.md']);
    
    (fs.stat as jest.Mock)
      .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true })
      .mockResolvedValueOnce({ isDirectory: () => true, isFile: () => false })
      .mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true });

    const result = await walk('/test');

    expect(result).toEqual([
      { path: '/test/dir.mdx', parentPath: undefined },
      { path: '/test/dir/file.md', parentPath: '/test/dir.mdx' }
    ]);
  });
});

