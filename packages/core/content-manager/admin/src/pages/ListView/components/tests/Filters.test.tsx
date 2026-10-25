import * as React from 'react';

import { useAdminUsers, useQueryParams } from '@strapi/admin/strapi-admin';
import { render as renderRTL, screen } from '@tests/utils';
import { IntlProvider } from 'react-intl';

import { listViewFilters as Filters } from '../Filters';

import type { Schema } from '../../../../hooks/useDocument';
import type { ListLayout } from '../../../../hooks/useDocumentLayout';

type MockPermission = {
  action: string;
  subject: string | null;
  properties?: { fields?: string[] };
};

const ARTICLE_READ_PERMISSIONS: MockPermission[] = [
  {
    action: 'plugin::content-manager.explorer.read',
    subject: 'api::article.article',
    properties: {
      fields: ['title', 'period'],
    },
  },
];

let mockPermissions: MockPermission[] = ARTICLE_READ_PERMISSIONS;

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useAdminUsers: jest.fn(() => ({ data: { users: [] }, isLoading: false })),
  useAuth: jest.fn(() => mockPermissions),
  useQueryParams: jest.fn(() => [{ query: {} }]),
  useStrapiApp: jest.fn((_name, selector) =>
    selector({
      runHookWaterfall: jest.fn((_hookName, payload) => payload),
    })
  ),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
}));

jest.mock('../../../../hooks/useContentTypeSchema', () => ({
  useContentTypeSchema: jest.fn(() => ({ schemas: [] })),
}));

jest.mock('../../../../services/contentTypes', () => ({
  useGetContentTypeConfigurationQuery: jest.fn(() => ({
    metadata: {
      id: {
        list: {
          label: 'ID',
        },
      },
      documentId: {
        list: {
          label: 'Document ID',
        },
      },
    },
  })),
}));

const enumerationSchema = {
  uid: 'api::article.article',
  isDisplayed: true,
  apiID: 'article',
  modelName: 'article',
  globalId: 'Article',
  modelType: 'contentType',
  kind: 'collectionType',
  info: {
    displayName: 'Article',
    singularName: 'article',
    pluralName: 'articles',
  },
  options: {},
  pluginOptions: {},
  attributes: {
    id: { type: 'integer' },
    documentId: { type: 'string' },
    title: { type: 'string' },
    period: { type: 'enumeration', enum: ['morning', 'evening'] },
    createdAt: { type: 'datetime' },
    updatedAt: { type: 'datetime' },
  },
} satisfies Schema;

const enumerationLayout = {
  layout: [],
  metadatas: {
    period: {
      label: 'Period',
    },
  },
  options: {},
  settings: {
    bulkable: true,
    filterable: true,
    searchable: true,
    pageSize: 10,
    mainField: 'id',
    defaultSortBy: 'id',
    defaultSortOrder: 'ASC' as const,
  },
} satisfies ListLayout;

const renderEnumerationFilters = (messages?: Record<string, string>) =>
  renderRTL(
    <Filters.Root schema={enumerationSchema} layout={enumerationLayout}>
      <Filters.Trigger />
      <Filters.Popover />
      <Filters.List />
    </Filters.Root>,
    messages
      ? {
          renderOptions: {
            wrapper: ({ children }) => (
              <IntlProvider locale="en" defaultLocale="en" textComponent="span" messages={messages}>
                {children}
              </IntlProvider>
            ),
          },
        }
      : undefined
  );

describe('ListView Filters', () => {
  beforeEach(() => {
    mockPermissions = ARTICLE_READ_PERMISSIONS;
  });

  it('renders no attribute options when the model has no read permission', async () => {
    mockPermissions = [
      {
        action: 'plugin::content-manager.explorer.read',
        subject: 'api::other.other',
        properties: { fields: ['title', 'period'] },
      },
    ];

    const { user } = renderEnumerationFilters();

    const trigger = screen.getByRole('button', { name: 'Filters' });
    await user.click(trigger);

    // The popover is open, but it holds no attribute to filter on.
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('combobox', { name: 'Select field' })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('does not crash when filterable field metadata is not loaded yet', async () => {
    const schema = {
      uid: 'api::article.article',
      isDisplayed: true,
      apiID: 'article',
      modelName: 'article',
      globalId: 'Article',
      modelType: 'contentType',
      kind: 'collectionType',
      info: {
        displayName: 'Article',
        singularName: 'article',
        pluralName: 'articles',
      },
      options: {},
      pluginOptions: {},
      attributes: {
        id: { type: 'integer' },
        documentId: { type: 'string' },
        title: { type: 'string' },
        createdAt: { type: 'datetime' },
        updatedAt: { type: 'datetime' },
      },
    } satisfies Schema;

    const layout = {
      layout: [],
      metadatas: {},
      options: {},
      settings: {
        bulkable: true,
        filterable: true,
        searchable: true,
        pageSize: 10,
        mainField: 'id',
        defaultSortBy: 'id',
        defaultSortOrder: 'ASC' as const,
      },
    } satisfies ListLayout;

    renderRTL(
      <Filters.Root schema={schema} layout={layout}>
        <Filters.Trigger />
        <Filters.Popover />
        <Filters.List />
      </Filters.Root>
    );

    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();
  });

  it('translates enumeration filter option labels using the enum value as the message id', async () => {
    const { user } = renderEnumerationFilters({ morning: 'Le matin', evening: 'Le soir' });

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(await screen.findByRole('combobox', { name: 'Select field' }));
    await user.click(await screen.findByRole('option', { name: 'Period' }));
    await user.click(await screen.findByRole('combobox', { name: 'Period' }));

    expect(await screen.findByRole('option', { name: 'Le matin' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Le soir' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'morning' })).not.toBeInTheDocument();
  });

  it('falls back to the raw enum value when no translation is registered', async () => {
    const { user } = renderEnumerationFilters();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(await screen.findByRole('combobox', { name: 'Select field' }));
    await user.click(await screen.findByRole('option', { name: 'Period' }));
    await user.click(await screen.findByRole('combobox', { name: 'Period' }));

    expect(await screen.findByRole('option', { name: 'morning' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'evening' })).toBeInTheDocument();
  });

  it('fetches user details and displays user display name for "is not" ($ne) filter', () => {
    mockPermissions = [
      ...ARTICLE_READ_PERMISSIONS,
      {
        action: 'admin::users.read',
        subject: null,
      },
    ];

    const search = '?filters[$and][0][createdBy][id][$ne]=42';

    jest.mocked(useQueryParams).mockReturnValue([
      {
        query: {
          filters: {
            $and: [
              {
                createdBy: {
                  id: {
                    $ne: '42',
                  },
                },
              },
            ],
          },
        },
        rawQuery: search,
      },
      jest.fn(),
    ]);

    jest.mocked(useAdminUsers).mockReturnValue({
      data: {
        users: [
          {
            id: 42,
            firstname: 'John',
            lastname: 'Doe',
          },
        ],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminUsers>);

    const userSchema = {
      ...enumerationSchema,
      attributes: {
        ...enumerationSchema.attributes,
        createdBy: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'admin::user',
        },
      },
    } satisfies Schema;

    const userLayout = {
      ...enumerationLayout,
      metadatas: {
        ...enumerationLayout.metadatas,
        createdBy: {
          label: 'Created by',
        },
      },
    } satisfies ListLayout;

    renderRTL(
      <Filters.Root schema={userSchema} layout={userLayout}>
        <Filters.Trigger />
        <Filters.Popover />
        <Filters.List />
      </Filters.Root>,
      {
        initialEntries: [{ search }],
        renderOptions: {
          wrapper: ({ children }) => (
            <IntlProvider
              locale="en"
              defaultLocale="en"
              textComponent="span"
              messages={{
                'components.FilterOptions.FILTER_TYPES.$ne': 'is not',
              }}
            >
              {children}
            </IntlProvider>
          ),
        },
      }
    );

    expect(useAdminUsers).toHaveBeenCalledWith(
      { filters: { id: { $in: ['42'] } } },
      expect.anything()
    );
    expect(screen.getByText('Created by is not John Doe')).toBeInTheDocument();
  });
});
