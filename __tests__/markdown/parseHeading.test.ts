import { parseHeading } from '@/src/markdown';

describe('parseHeading', () => {
  test('parses heading with custom anchor', () => {
    const result = parseHeading('Heading Text [#custom-anchor]');
    expect(result).toEqual({ heading: 'Heading Text', customAnchor: 'custom-anchor' });
  });

  test('parses heading without custom anchor', () => {
    const result = parseHeading('Heading Text');
    expect(result).toEqual({ heading: 'Heading Text' });
  });

  test('handles empty string', () => {
    const result = parseHeading('');
    expect(result).toEqual({ heading: '' });
  });

  test('handles heading with multiple square brackets', () => {
    const result = parseHeading('Heading [with] [#custom-anchor]');
    expect(result).toEqual({ heading: 'Heading [with]', customAnchor: 'custom-anchor' });
  });

  test('handles heading with only custom anchor', () => {
    const result = parseHeading('[#custom-anchor]');
    expect(result).toEqual({ heading: '', customAnchor: 'custom-anchor' });
  });
});

