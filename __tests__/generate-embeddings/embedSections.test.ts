import { embedSections } from '@/src/main';
import { embedMany } from 'ai';
import { OPENAI_EMBEDDING_MODEL } from '@/src/config';

jest.mock('ai');

describe('embedSections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls embedMany with correct parameters and returns expected result', async () => {
    const mockSections = [
      { content: 'test content 1', heading: 'Test 1', slug: 'test-1' },
      { content: 'test content 2', heading: 'Test 2', slug: 'test-2' },
    ];
    const mockEmbeddings = [[0.1, 0.2], [0.3, 0.4]];
    (embedMany as jest.Mock).mockResolvedValue({ embeddings: mockEmbeddings, usage: { tokens: 10 } });

    const result = await embedSections(mockSections);

    expect(embedMany).toHaveBeenCalledWith({
      values: ['test content 1', 'test content 2'],
      model: OPENAI_EMBEDDING_MODEL.name,
      maxRetries: OPENAI_EMBEDDING_MODEL.maxRetries,
    });
    expect(result).toEqual({
      embeddings: mockEmbeddings,
      tokens: 10,
      sections: mockSections,
    });
  });

  test('sorts sections by slug', async () => {
    const mockSections = [
      { content: 'test content 2', heading: 'Test 2', slug: 'test-2' },
      { content: 'test content 1', heading: 'Test 1', slug: 'test-1' },
    ];
    const mockEmbeddings = [[0.3, 0.4], [0.1, 0.2]];
    (embedMany as jest.Mock).mockResolvedValue({ embeddings: mockEmbeddings, usage: { tokens: 10 } });

    const result = await embedSections(mockSections);

    expect(result.sections).toEqual([
      { content: 'test content 1', heading: 'Test 1', slug: 'test-1' },
      { content: 'test content 2', heading: 'Test 2', slug: 'test-2' },
    ]);
  });

  test('handles empty sections array', async () => {
    (embedMany as jest.Mock).mockResolvedValue({ embeddings: [], usage: { tokens: 0 } });

    const result = await embedSections([]);

    expect(result).toEqual({
      embeddings: [],
      tokens: 0,
      sections: [],
    });
  });

  test('handles embedMany error', async () => {
    const mockSections = [{ content: 'test content', heading: 'Test', slug: 'test' }];
    (embedMany as jest.Mock).mockRejectedValue(new Error('Embedding error'));

    await expect(embedSections(mockSections)).rejects.toThrow('Embedding error');
  });
});

