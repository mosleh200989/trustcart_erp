import { useCallback, useEffect, useState } from 'react';
import { FaCheck, FaPaperPlane, FaSyncAlt } from 'react-icons/fa';
import AutomationLayout from '@/layouts/AutomationLayout';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  automation,
  AutomationConversation,
  AutomationMessage,
} from '@/services/automation';
import {
  Badge,
  Card,
  EmptyState,
  buttonClass,
  buttonSecondaryClass,
  errorMessage,
  formatWhen,
  inputClass,
} from '@/components/automation/AutomationUI';

const STATUS_FILTERS = [
  { value: 'needs_human', label: 'Needs a human' },
  { value: '', label: 'All' },
  { value: 'bot', label: 'Bot handling' },
  { value: 'human', label: 'Taken over' },
  { value: 'closed', label: 'Closed' },
];

/**
 * The conversation inbox: threads the bot escalated, plus every thread it is
 * handling, with the full message history and a box to reply by hand.
 */
export default function AutomationInboxPage() {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canReply = hasPermission('reply-automation-inbox');

  const [status, setStatus] = useState('needs_human');
  const [conversations, setConversations] = useState<AutomationConversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [thread, setThread] = useState<{
    conversation: AutomationConversation;
    messages: AutomationMessage[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await automation.listConversations(status ? { status } : {});
      setConversations(result.rows);
      setSelectedId((prev) => prev ?? result.rows[0]?.id ?? null);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load conversations'));
    } finally {
      setLoading(false);
    }
  }, [status, toast]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadThread = useCallback(async () => {
    if (!selectedId) {
      setThread(null);
      return;
    }
    try {
      setThread(await automation.getConversation(selectedId));
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load the conversation'));
    }
  }, [selectedId, toast]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  const send = async () => {
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    try {
      await automation.reply(selectedId, reply.trim());
      setReply('');
      toast.success('Reply queued — the thread is now yours, the bot stands down');
      await Promise.all([loadThread(), loadList()]);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not send the reply'));
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (next: string) => {
    if (!selectedId) return;
    try {
      await automation.setConversationStatus(selectedId, next);
      toast.success(`Marked as ${next.replace('_', ' ')}`);
      await Promise.all([loadThread(), loadList()]);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const approveHeld = async (id: number) => {
    try {
      await automation.approveHeld(id);
      toast.success('Held reply approved and sent');
      await loadThread();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <AutomationLayout
      title="Inbox"
      subtitle="Conversations the bot escalated, and everything it is handling."
      actions={
        <button onClick={loadList} className={buttonSecondaryClass} disabled={loading}>
          <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value || 'all'}
            onClick={() => {
              setStatus(filter.value);
              setSelectedId(null);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              status === filter.value
                ? 'bg-slate-800 font-medium text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card title={`${conversations.length} thread(s)`} className="lg:max-h-[70vh] lg:overflow-y-auto">
          {conversations.length === 0 ? (
            <EmptyState message="Nothing here" hint="No conversations match this filter." />
          ) : (
            <ul className="space-y-2">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    onClick={() => setSelectedId(conversation.id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      selectedId === conversation.id
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-800">
                        {conversation.display_name || conversation.thread_key}
                      </span>
                      <Badge value={conversation.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {conversation.thread_type} · {conversation.message_count} message(s) ·{' '}
                      {formatWhen(conversation.last_inbound_at || conversation.updated_at)}
                    </p>
                    {conversation.escalation_reason && (
                      <p className="mt-1 truncate text-xs text-amber-700">
                        {conversation.escalation_reason}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={
            thread
              ? thread.conversation.display_name || thread.conversation.thread_key
              : 'Select a conversation'
          }
          subtitle={
            thread
              ? `${thread.conversation.thread_type} thread · ${thread.conversation.status.replace('_', ' ')}`
              : undefined
          }
          actions={
            thread && canReply ? (
              <>
                {thread.conversation.status !== 'bot' && (
                  <button onClick={() => changeStatus('bot')} className={buttonSecondaryClass}>
                    Give back to bot
                  </button>
                )}
                {thread.conversation.status !== 'closed' && (
                  <button onClick={() => changeStatus('closed')} className={buttonSecondaryClass}>
                    Close
                  </button>
                )}
              </>
            ) : undefined
          }
        >
          {!thread ? (
            <EmptyState message="No conversation selected" />
          ) : (
            <>
              <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
                {thread.messages.length === 0 && <EmptyState message="No messages yet" />}
                {thread.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        message.direction === 'inbound'
                          ? 'bg-slate-100 text-slate-800'
                          : message.status === 'held'
                            ? 'border border-purple-300 bg-purple-50 text-purple-900'
                            : message.status === 'failed'
                              ? 'border border-red-300 bg-red-50 text-red-900'
                              : 'bg-slate-800 text-white'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.text || '(no text)'}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] opacity-70">
                        <span>{formatWhen(message.created_at)}</span>
                        {message.source && <Badge value={message.source} />}
                        {message.status !== 'sent' && <Badge value={message.status} />}
                        {message.confidence != null && (
                          <span>confidence {Number(message.confidence).toFixed(2)}</span>
                        )}
                        {message.ai_model && <span>{message.ai_model}</span>}
                      </div>
                      {message.meta?.reason && (
                        <p className="mt-1 text-[11px] italic opacity-60">
                          why: {message.meta.reason}
                        </p>
                      )}
                      {message.error && (
                        <p className="mt-1 text-[11px] font-medium">error: {message.error}</p>
                      )}
                      {message.status === 'held' && canReply && (
                        <button
                          onClick={() => approveHeld(message.id)}
                          className="mt-2 inline-flex items-center gap-1 rounded-md bg-purple-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-purple-700"
                        >
                          <FaCheck /> Approve &amp; send
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {canReply && (
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                  <input
                    className={inputClass}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                    placeholder="Type a reply — this takes the thread over from the bot"
                  />
                  <button onClick={send} className={buttonClass} disabled={sending || !reply.trim()}>
                    <FaPaperPlane /> {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </AutomationLayout>
  );
}
