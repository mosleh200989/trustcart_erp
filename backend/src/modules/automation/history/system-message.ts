/**
 * Recognises messages that were not written by a person.
 *
 * A page's outbound history is not all agent writing. Facebook injects its own
 * text into the thread, Meta's Instant Reply and follow-up features post on the
 * page's behalf, and the CRM logs assignment and labelling events into the same
 * stream. In the Kasri corpus roughly six hundred of the most-repeated outbound
 * messages were one of these — more than any genuine reply.
 *
 * They matter because they are indistinguishable from agent replies by every
 * other signal: outbound, well-formed, and repeated hundreds of times, which is
 * exactly what "this is the house style" normally looks like. Left in, the most
 * frequent thing the model would learn to write is Facebook boilerplate.
 */

const SYSTEM_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  // Facebook's own text when replying to a comment from the inbox.
  { label: 'fb_comment_context', pattern: /^You are responding to a user comment/i },
  { label: 'fb_comment_context_bn', pattern: /আপনি আপনার পৃষ্ঠাত একজন ব্যবহারকারী পোস্টে উত্তর দিয়েছেন/ },

  // Meta Instant Reply and the automated follow-up nudge.
  { label: 'meta_instant_reply', pattern: /^Hi,?\s+.{1,40}!\s*Please let us know how we can help you\.?$/i },
  { label: 'meta_follow_up', pattern: /We wanted to follow up\.\s*Do you have any questions\?/i },

  // Inbox / CRM bookkeeping.
  { label: 'crm_assignment', pattern: /assigned this conversation to/i },
  { label: 'crm_label', pattern: /^Auto-label added:/i },
  { label: 'crm_lead_stage', pattern: /Lead stage set to/i },
  { label: 'calling_window', pattern: /calling window has been reset/i },

  // Delivery failures reported into the thread.
  { label: 'delivery_error', pattern: /This account can't receive your message/i },
  { label: 'delivery_error_generic', pattern: /don't allow new message requests/i },
];

export type SystemMessageMatch = { isSystem: boolean; label: string | null };

/**
 * Whether this outbound message came from Facebook or the CRM rather than a
 * person. Returns the matching label so the reason is visible rather than the
 * message merely disappearing from the candidate list.
 */
export function classifySystemMessage(text: string | null | undefined): SystemMessageMatch {
  const value = String(text ?? '').trim();
  if (!value) return { isSystem: false, label: null };

  for (const { label, pattern } of SYSTEM_PATTERNS) {
    if (pattern.test(value)) return { isSystem: true, label };
  }
  return { isSystem: false, label: null };
}

export function isSystemMessage(text: string | null | undefined): boolean {
  return classifySystemMessage(text).isSystem;
}
