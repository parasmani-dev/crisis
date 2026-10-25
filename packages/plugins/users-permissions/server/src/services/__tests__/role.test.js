'use strict';

const roleService = require('../role');

describe('Role Service', () => {
  let strapi;
  let service;

  beforeEach(() => {
    strapi = {
      db: {
        query: jest.fn(),
      },
      plugins: {
        'users-permissions': {
          services: {
            'users-permissions': {
              getActions: jest.fn().mockReturnValue({
                'api::restaurant': {
                  controllers: {
                    restaurant: {
                      find: { enabled: false, policy: '' },
                      findOne: { enabled: false, policy: '' },
                    },
                  },
                },
              }),
            },
          },
        },
      },
    };

    global.strapi = strapi;
    service = roleService({ strapi });
  });

  afterEach(() => {
    delete global.strapi;
  });

  describe('findOne', () => {
    it('correctly maps enabled permissions into the role response', async () => {
      const mockRole = {
        id: 1,
        name: 'Public',
        permissions: [
          { action: 'api::restaurant.restaurant.find' },
          { action: 'api::restaurant.restaurant.findOne' },
        ],
      };

      strapi.db.query.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockRole),
      });

      const result = await service.findOne(1);

      expect(result.permissions['api::restaurant'].controllers.restaurant.find.enabled).toBe(true);
      expect(result.permissions['api::restaurant'].controllers.restaurant.findOne.enabled).toBe(
        true
      );
    });
  });
});
