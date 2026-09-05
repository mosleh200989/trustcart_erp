import { getMetadataArgsStorage } from 'typeorm';

import { AUTOMATION_ENTITIES } from './index';

/**
 * The single source of truth, so this guard cannot go stale.
 *
 * It used to be a hand-written list, which made it silently vacuous for any
 * entity someone forgot to add — and forgetting to add an entity to a list is
 * precisely the bug that took the reply engine down in production.
 */
const ENTITIES = AUTOMATION_ENTITIES;


/**
 * Guards against a failure that only shows up at boot, against a real database,
 * and therefore sails through `tsc`, `nest build` and every other unit test.
 *
 * TypeORM infers a column's database type from TypeScript's `design:type`
 * reflection metadata when the decorator does not state one. For a union like
 * `string | null` TypeScript emits `Object`, which Postgres cannot map, and the
 * app dies on startup with:
 *
 *     DataTypeNotSupportedError: Data type "Object" in
 *     "AutomationChannel.ig_account_id" is not supported by "postgres" database.
 *
 * Since every nullable column in this module is typed `T | null`, the only safe
 * rule is that no column may rely on inference at all.
 */
describe('automation entity metadata', () => {
  const storage = getMetadataArgsStorage();

  it.each(ENTITIES.map((entity) => [entity.name, entity] as const))(
    '%s declares an explicit column type on every regular column',
    (_name, entity) => {
      // Only `regular` columns infer their type. `createDate` / `updateDate` /
      // `increment` columns carry their type in the mode itself, so TypeORM
      // never consults reflection for them.
      const columns = storage.columns.filter(
        (column) => column.target === entity && column.mode === 'regular',
      );

      // A typo in the import list would silently make this test vacuous.
      expect(columns.length).toBeGreaterThan(0);

      const inferred = columns
        .filter((column) => !column.options?.type)
        .map((column) => String(column.propertyName));

      expect(inferred).toEqual([]);
    },
  );

  it('registers every automation entity against its table', () => {
    const tables = ENTITIES.map((entity) => {
      const table = storage.tables.find((candidate) => candidate.target === entity);
      return table?.name;
    });

    // Every entity resolves to a table, and none is registered twice.
    expect(tables.filter(Boolean)).toHaveLength(ENTITIES.length);
    expect(new Set(tables).size).toBe(ENTITIES.length);
    expect(tables).toContain('automation_faqs');
    expect(tables).toContain('automation_order_drafts');
  });
});
