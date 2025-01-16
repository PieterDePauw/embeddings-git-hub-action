import { generateVersionInfo } from '@/src/main';

describe('generateVersionInfo', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns correct structure with GITHUB_SHA', () => {
    process.env.GITHUB_SHA = 'test-sha';
    const result = generateVersionInfo();
    expect(result).toEqual({
      refreshVersion: 'test-sha',
      refreshDate: expect.any(Date),
    });
  });

  test('returns correct structure without GITHUB_SHA', () => {
    delete process.env.GITHUB_SHA;
    const result = generateVersionInfo();
    expect(result).toEqual({
      refreshVersion: expect.any(String),
      refreshDate: expect.any(Date),
    });
  });

  test('returns UUID when GITHUB_SHA is NO_SHA_FOUND', () => {
    process.env.GITHUB_SHA = 'NO_SHA_FOUND';
    const result = generateVersionInfo();
    expect(result).toEqual({
      refreshVersion: expect.any(String),
      refreshDate: expect.any(Date),
    });
    expect(result.refreshVersion).not.toBe('NO_SHA_FOUND');
  });
});

