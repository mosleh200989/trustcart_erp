import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import VoiceRecorder from '@/components/admin/VoiceRecorder';
import { STATUS_META, PRIORITY_META } from './index';
import {
  FaArrowLeft, FaBug, FaEdit, FaHistory, FaImage, FaPaperPlane, FaTrash,
} from 'react-icons/fa';

/**
 * Issue detail: description, interleaved timeline of comments and workflow
 * events, and exactly the transition buttons the server would accept for the
 * current viewer (viewer.transitions comes from the API, which is the same
 * transition table that enforces them).
 */

interface Attachment {
  id: number;
  kind: 'image' | 'voice';
  url: string;
  originalName?: string;
  mime: string;
  durationSecs?: number;
  createdAt: string;
}

interface TimelineComment {
  id: number;
  author: { id: number; name?: string };
  body: string | null;
  deleted: boolean;
  edited: boolean;
  previousVersions: Array<{ body: string; createdAt: string }>;
  attachments: Attachment[];
  createdAt: string;
}

interface TimelineEvent {
  id: number;
  actor: { id: number; name?: string };
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  payload: Record<string, any>;
  createdAt: string;
}

interface IssueDetail {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  reporter: { id: number; name?: string };
  assignee: { id: number; name?: string } | null;
  attachments: Attachment[];
  comments: TimelineComment[];
  events: TimelineEvent[];
  viewer: {
    isReporter: boolean;
    isManager: boolean;
    isAdmin: boolean;
    transitions: Array<{ to: string; action: string; requiresComment: boolean }>;
  };
  createdAt: string;
  updatedAt: string;
}

const ACTION_LABEL: Record<string, string> = {
  created: 'reported this issue',
  started: 'started working on this',
  released: 'put this back in the queue',
  resolved: 'marked this as done',
  resumed: 'took this back into progress',
  review_started: 'started reviewing the fix',
  accepted: 'accepted the fix and closed this',
  reopened: 'reopened this',
  admin_closed: 'closed this (admin override)',
  admin_reopened: 'reopened this (admin override)',
  commented: 'commented',
  comment_edited: 'edited a comment',
  comment_deleted: 'deleted a comment',
  attachment_added: 'added an attachment',
  edited: 'edited the issue',
};

const TRANSITION_BUTTON: Record<string, { label: string; cls: string }> = {
  started: { label: 'Start working', cls: 'bg-amber-600 hover:bg-amber-700' },
  released: { label: 'Put back in queue', cls: 'bg-gray-500 hover:bg-gray-600' },
  resolved: { label: 'Mark as done', cls: 'bg-purple-600 hover:bg-purple-700' },
  resumed: { label: 'Take back into progress', cls: 'bg-amber-600 hover:bg-amber-700' },
  review_started: { label: 'Start review', cls: 'bg-cyan-600 hover:bg-cyan-700' },
  accepted: { label: 'Accept & close', cls: 'bg-emerald-600 hover:bg-emerald-700' },
  reopened: { label: 'Reopen (not fixed)', cls: 'bg-red-600 hover:bg-red-700' },
  admin_closed: { label: 'Close (admin)', cls: 'bg-gray-700 hover:bg-gray-800' },
  admin_reopened: { label: 'Reopen (admin)', cls: 'bg-red-600 hover:bg-red-700' },
};

export default function IssueDetailPage() {
  const router = useRouter();
  const toast = useToast();
  const issueId = Number(router.query.id);

  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [commentFor, setCommentFor] = useState<{ to: string; action: string } | null>(null);
  const [transitionComment, setTransitionComment] = useState('');
  const [showHistoryFor, setShowHistoryFor] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', category: 'bug', priority: 'normal' });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!issueId) return;
    try {
      const { data } = await apiClient.get(`/issues/${issueId}`);
      setIssue(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load the issue');
    } finally {
      setLoading(false);
    }
  }, [issueId, toast]);

  useEffect(() => { load(); }, [load]);

  /** Comments and events interleaved by time, oldest first. */
  const timeline = useMemo(() => {
    if (!issue) return [];
    const commentEventIds = new Set(
      issue.events.filter((e) => e.action === 'commented').map((e) => e.payload?.commentId),
    );
    const entries: Array<{ at: string; kind: 'comment' | 'event'; comment?: TimelineComment; event?: TimelineEvent }> = [
      ...issue.comments.map((c) => ({ at: c.createdAt, kind: 'comment' as const, comment: c })),
      ...issue.events
        // A plain "commented" event would duplicate the comment right beside it.
        .filter((e) => !(e.action === 'commented' && commentEventIds.has(e.payload?.commentId)))
        .map((e) => ({ at: e.createdAt, kind: 'event' as const, event: e })),
    ];
    return entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [issue]);

  const doTransition = async (to: string, action: string, requiresComment: boolean) => {
    if (requiresComment) {
      setCommentFor({ to, action });
      setTransitionComment('');
      return;
    }
    await submitTransition(to);
  };

  const submitTransition = async (to: string, comment?: string) => {
    setTransitioning(true);
    try {
      const { data } = await apiClient.post(`/issues/${issueId}/transition`, { to, comment });
      setIssue(data);
      setCommentFor(null);
      toast.success('Status updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Transition refused');
    } finally {
      setTransitioning(false);
    }
  };

  const sendComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    try {
      await apiClient.post(`/issues/${issueId}/comments`, { body: commentText.trim() });
      setCommentText('');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to comment');
    } finally {
      setSending(false);
    }
  };

  const deleteComment = async (commentId: number) => {
    if (!window.confirm('Delete this comment? A tombstone stays in the timeline.')) return;
    try {
      await apiClient.post(`/issues/comments/${commentId}/delete`);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete comment');
    }
  };

  const uploadFile = async (file: Blob, kind: 'image' | 'voice', name: string, durationSecs?: number) => {
    const form = new FormData();
    form.append('file', file, name);
    const params = new URLSearchParams({ kind });
    if (durationSecs) params.set('durationSecs', String(durationSecs));
    try {
      await apiClient.post(`/issues/${issueId}/attachments?${params.toString()}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(kind === 'voice' ? 'Voice note attached' : 'Image attached');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    }
  };

  const onImagePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadFile(f, 'image', f.name);
    e.target.value = '';
  };

  const startEdit = () => {
    if (!issue) return;
    setEditForm({
      title: issue.title,
      description: issue.description,
      category: issue.category,
      priority: issue.priority,
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    try {
      const { data } = await apiClient.patch(`/issues/${issueId}`, editForm);
      setIssue(data);
      setEditing(false);
      toast.success('Issue updated — the previous text is kept in the history');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update');
    }
  };

  if (loading) {
    return <AdminLayout><div className="p-10 text-center text-gray-400">Loading…</div></AdminLayout>;
  }
  if (!issue) {
    return <AdminLayout><div className="p-10 text-center text-gray-400">Issue not found.</div></AdminLayout>;
  }

  const statusMeta = STATUS_META[issue.status] || { label: issue.status, cls: 'bg-gray-100' };

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <Link href="/admin/issues" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <FaArrowLeft /> All issues
        </Link>

        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <FaBug className="text-red-500 shrink-0" />
                <h1 className="text-xl font-bold text-gray-800 break-words">
                  #{issue.id} {issue.title}
                </h1>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusMeta.cls}`}>{statusMeta.label}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITY_META[issue.priority]?.cls || ''}`}>
                  {PRIORITY_META[issue.priority]?.label || issue.priority}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-600">{issue.category}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Reported by <strong>{issue.reporter?.name || `#${issue.reporter?.id}`}</strong>
                {' '}on {new Date(issue.createdAt).toLocaleString()}
                {issue.assignee && <> · assigned to <strong>{issue.assignee.name || `#${issue.assignee.id}`}</strong></>}
              </p>
            </div>
            <button onClick={startEdit} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
              <FaEdit /> Edit
            </button>
          </div>

          {issue.description && (
            <div className="mt-4 text-gray-700 whitespace-pre-wrap border-t pt-4">{issue.description}</div>
          )}

          {issue.attachments.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {issue.attachments.map((a) => <AttachmentView key={a.id} a={a} />)}
            </div>
          )}

          {/* Workflow actions — exactly what the server will accept for this viewer */}
          {issue.viewer.transitions.length > 0 && (
            <div className="mt-5 border-t pt-4 flex flex-wrap gap-2">
              {issue.viewer.transitions.map((t) => {
                const meta = TRANSITION_BUTTON[t.action] || { label: `→ ${t.to}`, cls: 'bg-gray-600 hover:bg-gray-700' };
                return (
                  <button
                    key={`${t.action}-${t.to}`}
                    disabled={transitioning}
                    onClick={() => doTransition(t.to, t.action, t.requiresComment)}
                    className={`px-4 py-2 rounded text-white text-sm disabled:opacity-50 ${meta.cls}`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Timeline</h2>
          <div className="space-y-4">
            {timeline.length === 0 && <p className="text-gray-400 text-sm">Nothing yet.</p>}
            {timeline.map((entry) =>
              entry.kind === 'comment' && entry.comment ? (
                <div key={`c-${entry.comment.id}`} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-gray-800">
                      {entry.comment.author?.name || `#${entry.comment.author?.id}`}
                    </span>
                    <span className="text-gray-400 text-xs flex items-center gap-3">
                      {entry.comment.edited && !entry.comment.deleted && (
                        <button
                          onClick={() => setShowHistoryFor(showHistoryFor === entry.comment!.id ? null : entry.comment!.id)}
                          className="inline-flex items-center gap-1 hover:text-gray-600"
                          title="Show previous versions"
                        >
                          <FaHistory /> edited
                        </button>
                      )}
                      {new Date(entry.comment.createdAt).toLocaleString()}
                      {!entry.comment.deleted && (
                        <button onClick={() => deleteComment(entry.comment!.id)} className="hover:text-red-500" title="Delete">
                          <FaTrash />
                        </button>
                      )}
                    </span>
                  </div>
                  {entry.comment.deleted ? (
                    <p className="mt-2 text-sm italic text-gray-400">This comment was deleted. The record of it is kept in the history.</p>
                  ) : (
                    <p className="mt-2 text-gray-700 whitespace-pre-wrap text-sm">{entry.comment.body}</p>
                  )}
                  {showHistoryFor === entry.comment.id && entry.comment.previousVersions.length > 0 && (
                    <div className="mt-3 border-l-2 border-gray-200 pl-3 space-y-2">
                      {entry.comment.previousVersions.map((v, i) => (
                        <div key={i} className="text-xs text-gray-500">
                          <span className="text-gray-400">{new Date(v.createdAt).toLocaleString()}:</span>{' '}
                          <span className="whitespace-pre-wrap line-through decoration-gray-300">{v.body}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {entry.comment.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {entry.comment.attachments.map((a) => <AttachmentView key={a.id} a={a} />)}
                    </div>
                  )}
                </div>
              ) : entry.event ? (
                <div key={`e-${entry.event.id}`} className="flex items-center gap-3 text-sm text-gray-500 pl-1">
                  <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                  <span>
                    <strong className="text-gray-700">{entry.event.actor?.name || `#${entry.event.actor?.id}`}</strong>{' '}
                    {ACTION_LABEL[entry.event.action] || entry.event.action}
                    {entry.event.fromStatus && entry.event.toStatus && (
                      <span className="text-gray-400"> ({entry.event.fromStatus} → {entry.event.toStatus})</span>
                    )}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto shrink-0">{new Date(entry.event.createdAt).toLocaleString()}</span>
                </div>
              ) : null,
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="bg-white rounded-lg shadow p-6">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={3}
            placeholder="Write a comment…"
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <button
              onClick={sendComment}
              disabled={sending || !commentText.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              <FaPaperPlane /> Comment
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            >
              <FaImage /> Attach screenshot
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onImagePicked} />
            <VoiceRecorder onRecorded={(blob, mime, secs) => uploadFile(blob, 'voice', `voice-note.${mime.includes('mp4') ? 'm4a' : 'webm'}`, secs)} />
          </div>
        </div>

        {/* Transition-comment modal (reopen / admin override) */}
        {commentFor && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="font-semibold text-gray-800 mb-2">
                {TRANSITION_BUTTON[commentFor.action]?.label || commentFor.to}
              </h3>
              <p className="text-sm text-gray-500 mb-3">A written reason is required and becomes part of the permanent history.</p>
              <textarea
                value={transitionComment}
                onChange={(e) => setTransitionComment(e.target.value)}
                rows={4}
                autoFocus
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Explain why…"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setCommentFor(null)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">Cancel</button>
                <button
                  onClick={() => submitTransition(commentFor.to, transitionComment)}
                  disabled={!transitionComment.trim() || transitioning}
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editing && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Edit issue</h3>
              <div className="space-y-4">
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  maxLength={300}
                  className="w-full border rounded px-3 py-2"
                />
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={5}
                  className="w-full border rounded px-3 py-2"
                />
                <div className="grid grid-cols-2 gap-4">
                  <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="border rounded px-3 py-2">
                    {['bug', 'feature', 'data-issue', 'other'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} className="border rounded px-3 py-2">
                    {['low', 'normal', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <p className="text-xs text-gray-400">Edits are recorded — the previous text stays in the issue history.</p>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setEditing(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={saveEdit} className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function AttachmentView({ a }: { a: Attachment }) {
  if (a.kind === 'voice') {
    return (
      <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-gray-50">
        <audio controls src={a.url} className="h-9" preload="metadata" />
        {a.durationSecs ? <span className="text-xs text-gray-500">{a.durationSecs}s</span> : null}
      </div>
    );
  }
  return (
    <a href={a.url} target="_blank" rel="noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={a.url} alt={a.originalName || 'attachment'} className="h-24 rounded border object-cover hover:opacity-90" />
    </a>
  );
}
