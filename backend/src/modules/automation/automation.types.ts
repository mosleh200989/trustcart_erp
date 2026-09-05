/**
 * Small shared aliases for the automation module.
 *
 * These live outside the entity files so services can import a type without
 * pulling an entity (and its TypeORM decorators) into the import graph.
 */

export type AutomationThreadTypeAlias = 'comment' | 'message';

export type AutomationReplySource = 'rule' | 'erp' | 'faq' | 'ai' | 'human' | 'greeting';

/** Normalised shape of one inbound Meta event, whatever its original payload. */
export type NormalizedMetaEvent = {
  /** Stable id used for de-duplication — Meta's comment/message id. */
  metaEventId: string;
  eventType:
    | 'comment'
    | 'comment_edit'
    | 'message'
    | 'message_echo'
    | 'postback'
    | 'reaction'
    | 'unknown';
  pageId: string;
  threadType: AutomationThreadTypeAlias;
  /** PSID for Messenger, post id for comments. */
  threadKey: string;
  /** Author's id — compared against the page id to catch our own echoes. */
  senderId: string | null;
  senderName: string | null;
  text: string | null;
  /** The comment id to reply under, for comment events. */
  commentId: string | null;
  postId: string | null;
  psid: string | null;
  /** True when the event was produced by the page itself. */
  isEcho: boolean;
  raw: Record<string, any>;
};
