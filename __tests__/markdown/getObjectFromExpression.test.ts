import { getObjectFromExpression } from '@/src/markdown';

describe('getObjectFromExpression', () => {
  test('extracts object from expression with various types', () => {
    const expression = {
      type: 'ObjectExpression',
      properties: [
        {
          type: 'Property',
          key: { type: 'Identifier', name: 'title' },
          value: { type: 'Literal', value: 'Test Title' }
        },
        {
          type: 'Property',
          key: { type: 'Identifier', name: 'count' },
          value: { type: 'Literal', value: 42 }
        },
        {
          type: 'Property',
          key: { type: 'Identifier', name: 'isActive' },
          value: { type: 'Literal', value: true }
        },
        {
          type: 'Property',
          key: { type: 'Identifier', name: 'nullValue' },
          value: { type: 'Literal', value: null }
        }
      ]
    };

    const result = getObjectFromExpression(expression);

    expect(result).toEqual({
      title: 'Test Title',
      count: 42,
      isActive: true,
      nullValue: null
    });
  });

  test('handles empty object expression', () => {
    const expression = {
      type: 'ObjectExpression',
      properties: []
    };

    const result = getObjectFromExpression(expression);

    expect(result).toEqual({});
  });

  test('ignores non-literal properties', () => {
    const expression = {
      type: 'ObjectExpression',
      properties: [
        {
          type: 'Property',
          key: { type: 'Identifier', name: 'title' },
          value: { type: 'Literal', value: 'Test Title' }
        },
        {
          type: 'Property',
          key: { type: 'Identifier', name: 'complex' },
          value: { type: 'ObjectExpression', properties: [] }
        }
      ]
    };

    const result = getObjectFromExpression(expression);

    expect(result).toEqual({
      title: 'Test Title'
    });
  });
});

