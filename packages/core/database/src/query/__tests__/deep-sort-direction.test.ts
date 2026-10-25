import knex from 'knex';

import createQueryBuilder from '../query-builder';
import type { Database } from '../..';

/**
 * Regression test for issue #83 (BE-32):
 * Sorting by a relation field in descending order returns ascending order.
 *
 * When deep sort wraps the query with partitioned row numbers, the outer query
 * must preserve the requested sort directions (`desc` or `asc`) for both relation
 * and scalar fields.
 */

const ARTICLE_UID = 'api::article.article';
const TAG_UID = 'api::tag.tag';

const buildDb = () => {
  const connection = knex({ client: 'pg' });

  const meta: Record<
    string,
    { uid: string; tableName: string; attributes: Record<string, unknown> }
  > = {
    [ARTICLE_UID]: {
      uid: ARTICLE_UID,
      tableName: 'articles',
      attributes: {
        id: { type: 'integer', columnName: 'id' },
        title: { type: 'string', columnName: 'title' },
        tag: {
          type: 'relation',
          relation: 'manyToOne',
          target: TAG_UID,
          joinColumn: {
            name: 'tag_id',
            referencedColumn: 'id',
          },
        },
      },
    },
    [TAG_UID]: {
      uid: TAG_UID,
      tableName: 'tags',
      attributes: {
        id: { type: 'integer', columnName: 'id' },
        name: { type: 'string', columnName: 'name' },
      },
    },
  };

  const db = {
    connection,
    getConnection(tableNameArg?: string) {
      return tableNameArg ? connection(tableNameArg) : connection;
    },
    metadata: {
      get(uid: string) {
        if (meta[uid]) {
          return meta[uid];
        }
        throw new Error(`Unknown uid ${uid}`);
      },
    },
    dialect: {
      useReturning() {
        return false;
      },
      transformErrors(error: Error) {
        throw error;
      },
    },
  } as unknown as Database;

  return { db, uid: ARTICLE_UID };
};

describe('Deep sort direction (issue #83)', () => {
  it('honours descending order on relation fields in the outer query', () => {
    const { db, uid } = buildDb();
    const qb = createQueryBuilder(uid, db);

    qb.init({ orderBy: { tag: { name: 'desc' } } });

    const sql = qb.getKnexQuery().toSQL().sql;
    const lower = sql.toLowerCase();

    // The outer query must order by the deep-sort column descending
    const orderByIdx = lower.lastIndexOf('order by');
    expect(orderByIdx).toBeGreaterThan(-1);

    const outerOrderBy = lower.slice(orderByIdx);
    expect(outerOrderBy).toContain('__strapi_order_by__');
    expect(outerOrderBy).toContain('desc');
  });

  it('honours descending order when combining relation and scalar fields', () => {
    const { db, uid } = buildDb();
    const qb = createQueryBuilder(uid, db);

    qb.init({ orderBy: [{ tag: { name: 'desc' } }, { title: 'desc' }] });

    const sql = qb.getKnexQuery().toSQL().sql;
    const lower = sql.toLowerCase();

    const orderByIdx = lower.lastIndexOf('order by');
    expect(orderByIdx).toBeGreaterThan(-1);

    const outerOrderBy = lower.slice(orderByIdx);
    // Both columns must be ordered descending
    const descMatches = outerOrderBy.match(/desc/g);
    expect(descMatches).not.toBeNull();
    expect(descMatches?.length).toBe(2);
  });

  it('honours ascending order on relation fields', () => {
    const { db, uid } = buildDb();
    const qb = createQueryBuilder(uid, db);

    qb.init({ orderBy: { tag: { name: 'asc' } } });

    const sql = qb.getKnexQuery().toSQL().sql;
    const lower = sql.toLowerCase();

    const orderByIdx = lower.lastIndexOf('order by');
    expect(orderByIdx).toBeGreaterThan(-1);

    const outerOrderBy = lower.slice(orderByIdx);
    expect(outerOrderBy).toContain('__strapi_order_by__');
    expect(outerOrderBy).toContain('asc');
  });
});
