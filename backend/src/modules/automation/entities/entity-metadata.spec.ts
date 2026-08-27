import { getMetadataArgsStorage } from 'typeorm';

import { AutomationSetting } from './automation-setting.entity';
import { AutomationChannel } from './automation-channel.entity';
import { AutomationEvent } from './automation-event.entity';
import { AutomationConversation } from './automation-conversation.entity';
import { AutomationMessage } from './automation-message.entity';
import { AutomationRule } from './automation-rule.entity';
import { AutomationOutbox } from './automation-outbox.entity';
import { AutomationAudit } from './automation-audit.entity';

const ENTITIES = [
  AutomationSetting,
  AutomationChannel,
  AutomationEvent,
  AutomationConversation,
  AutomationMessage,
  AutomationRule,
  AutomationOutbox,
  AutomationAudit,
];

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

    expect(tables).toEqual([
      'automation_settings',
      'automation_channels',
      'automation_events',
      'automation_conversations',
      'automation_messages',
      'automation_rules',
      'automation_outbox',
      'automation_audit',
    ]);
  });
});
