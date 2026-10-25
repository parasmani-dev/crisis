import { getUsedAttributeNames } from '../getUsedAttributeNames';

describe('getUsedAttributeNames', () => {
  const attributes = [{ name: 'title' }, { name: 'description' }, { name: 'myField' }];

  it('returns all existing attribute names when adding a new attribute', () => {
    const result = getUsedAttributeNames(attributes, {
      initialData: {},
      modifiedData: { name: 'title' },
    });

    expect(result).toEqual(['title', 'description', 'myField']);
  });

  it('excludes the attribute initial name when editing an existing attribute', () => {
    const result = getUsedAttributeNames(attributes, {
      initialData: { name: 'title' },
      modifiedData: { name: 'title' },
    });

    expect(result).toEqual(['description', 'myField']);
  });

  it('does not exclude modifiedData.name when attempting to rename to an already existing attribute name', () => {
    const result = getUsedAttributeNames(attributes, {
      initialData: { name: 'title' },
      modifiedData: { name: 'description' },
    });

    expect(result).toEqual(['description', 'myField']);
  });

  it('handles snake_case comparison for the initial attribute name', () => {
    const result = getUsedAttributeNames(attributes, {
      initialData: { name: 'my_field' },
      modifiedData: {},
    });

    expect(result).toEqual(['title', 'description']);
  });
});
