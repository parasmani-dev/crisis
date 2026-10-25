import snakeCase from 'lodash/snakeCase';

export type SchemaData = {
  initialData: {
    name?: string;
    targetAttribute?: string | null;
    [key: string]: unknown;
  };
  modifiedData: {
    createComponent?: boolean;
    enum?: string[];
    name?: string;
    relation?: string;
    repeatable?: boolean;
    targetAttribute?: string | null;
    targetField?: string;
    type?: string;
    [key: string]: unknown;
  };
};

export type Attribute = {
  name: string;
};

export const getUsedAttributeNames = (
  attributes: Array<Attribute>,
  schemaData: SchemaData
): Array<string> => {
  const initialName = schemaData.initialData?.name
    ? snakeCase(schemaData.initialData.name)
    : undefined;

  return attributes
    .filter(({ name }) => !initialName || snakeCase(name) !== initialName)
    .map(({ name }) => name);
};
