import { AutomationSetting } from './automation-setting.entity';
import { AutomationChannel } from './automation-channel.entity';
import { AutomationEvent } from './automation-event.entity';
import { AutomationConversation } from './automation-conversation.entity';
import { AutomationMessage } from './automation-message.entity';
import { AutomationRule } from './automation-rule.entity';
import { AutomationFaq } from './automation-faq.entity';
import { AutomationOrderDraft } from './automation-order-draft.entity';
import { AutomationOutbox } from './automation-outbox.entity';
import { AutomationAudit } from './automation-audit.entity';
import { AutomationImportRun } from './automation-import-run.entity';
import { AutomationHistoryThread } from './automation-history-thread.entity';
import { AutomationHistoryMessage } from './automation-history-message.entity';

/**
 * Every entity this module owns, in one list.
 *
 * Two places need it and they are far apart: `TypeOrmModule.forFeature` here in
 * the module, and the explicit `entities` array on the root connection in
 * AppModule. Registering with only the first gets you an injectable repository
 * whose every query throws:
 *
 *     EntityMetadataNotFoundError: No metadata for "AutomationOrderDraft" was found.
 *
 * That is invisible to `tsc`, to `nest build`, to the unit tests, and even to
 * booting the app — it surfaces the first time a real message arrives, which is
 * exactly where it did surface. One list, imported by both, makes adding an
 * entity to one and not the other impossible rather than merely unlikely.
 */
export const AUTOMATION_ENTITIES = [
  AutomationSetting,
  AutomationChannel,
  AutomationEvent,
  AutomationConversation,
  AutomationMessage,
  AutomationRule,
  AutomationFaq,
  AutomationOrderDraft,
  AutomationOutbox,
  AutomationAudit,
  AutomationImportRun,
  AutomationHistoryThread,
  AutomationHistoryMessage,
];
