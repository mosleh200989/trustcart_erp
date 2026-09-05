import { useCallback, useEffect, useState } from 'react';
import { FaBullhorn, FaCheckCircle, FaPlus, FaSyncAlt, FaTrash } from 'react-icons/fa';
import AutomationLayout from '@/layouts/AutomationLayout';
import { useAutomationUnlocked } from '@/hooks/useAutomationGate';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/services/api';
import { automation, AutomationChannel, AutomationProduct } from '@/services/automation';
import {
  Badge,
  Card,
  EmptyState,
  Field,
  buttonClass,
  buttonDangerClass,
  buttonSecondaryClass,
  errorMessage,
  formatWhen,
  inputClass,
} from '@/components/automation/AutomationUI';

type Draft = Partial<AutomationChannel> & { page_access_token?: string };

const EMPTY_DRAFT: Draft = {
  name: '',
  platform: 'facebook',
  page_id: '',
  page_access_token: '',
  mode: 'shadow',
  reply_to_comments: true,
  reply_to_messages: true,
  private_reply_to_comments: false,
  max_replies_per_thread_hour: 3,
  featured_product_ids: [],
  is_active: true,
};

/**
 * The picker for the page's headline products.
 *
 * Separate component so the search state dies with the form. It resolves the
 * saved ids to names on open, because a list of bare numbers tells nobody
 * whether the right thing is configured.
 */
function FeaturedProducts({
  ids,
  onChange,
}: {
  ids: number[];
  onChange: (ids: number[]) => void;
}) {
  const [chosen, setChosen] = useState<AutomationProduct[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AutomationProduct[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    automation
      .resolveProducts(ids)
      .then((rows) => {
        if (!cancelled) setChosen(rows);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Resolve once per distinct id list, not on every keystroke elsewhere.
  }, [ids.join(',')]);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      setResults(await automation.searchProducts(query));
    } finally {
      setSearching(false);
    }
  };

  const add = (product: AutomationProduct) => {
    if (ids.includes(product.id)) return;
    setChosen((prev) => [...prev, product]);
    onChange([...ids, product.id]);
  };

  const remove = (id: number) => {
    setChosen((prev) => prev.filter((p) => p.id !== id));
    onChange(ids.filter((value) => value !== id));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {chosen.length === 0 && (
          <span className="text-xs text-slate-400">
            Nothing chosen — a message that names no product will be handed to a person.
          </span>
        )}
        {chosen.map((product) => (
          <span
            key={product.id}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs"
          >
            {product.name} — {product.salePrice ?? product.price} BDT
            <button
              type="button"
              onClick={() => remove(product.id)}
              className="font-bold text-slate-400 hover:text-red-600"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className={inputClass}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              search();
            }
          }}
          placeholder="Search the catalogue, e.g. kasri oil"
        />
        <button type="button" onClick={search} className={buttonSecondaryClass} disabled={searching}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {results.map((product) => (
            <li key={product.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>
                {product.name}{' '}
                <span className="text-slate-500">— {product.salePrice ?? product.price} BDT</span>
              </span>
              <button
                type="button"
                onClick={() => add(product)}
                className="text-xs font-medium text-blue-600 hover:underline"
                disabled={ids.includes(product.id)}
              >
                {ids.includes(product.id) ? 'Added' : 'Add'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Connected Facebook / Instagram pages: tokens, mode, brand voice, limits. */
export default function AutomationChannelsPage() {
  const toast = useToast();
  const unlocked = useAutomationUnlocked();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('manage-automation');

  const [channels, setChannels] = useState<AutomationChannel[]>([]);
  const [storefronts, setStorefronts] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [postDraft, setPostDraft] = useState<{ channelId: number; message: string } | null>(null);

  const load = useCallback(async () => {
    // Never call the panel API while the gate is closed: the request is
    // guaranteed to 403 and the error toast lands behind the password screen.
    if (!unlocked) return;
    setLoading(true);
    try {
      setChannels(await automation.listChannels());
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load channels'));
    } finally {
      setLoading(false);
    }
  }, [toast, unlocked]);

  useEffect(() => {
    load();
    if (!unlocked) return;
    // Brand list is read through the normal admin API — it is not automation data.
    apiClient
      .get('/storefronts')
      .then((res) => setStorefronts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setStorefronts([]));
  }, [load, unlocked]);

  const save = async () => {
    if (!draft) return;
    if (!draft.name?.trim() || !draft.page_id?.trim()) {
      toast.error('Name and Page ID are required');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: draft.name,
        platform: draft.platform || 'facebook',
        page_id: draft.page_id,
        mode: draft.mode,
        storefront_id: draft.storefront_id ?? null,
        reply_to_comments: Boolean(draft.reply_to_comments),
        reply_to_messages: Boolean(draft.reply_to_messages),
        private_reply_to_comments: Boolean(draft.private_reply_to_comments),
        persona: draft.persona || undefined,
        greeting: draft.greeting || undefined,
        signature: draft.signature || undefined,
        max_replies_per_thread_hour: Number(draft.max_replies_per_thread_hour ?? 3),
        featured_product_ids: draft.featured_product_ids ?? [],
        business_hours: draft.business_hours || {},
        is_active: draft.is_active !== false,
      };
      // An empty token field means "keep the saved one", never "clear it".
      if (draft.page_access_token) payload.page_access_token = draft.page_access_token;

      if (draft.id) {
        await automation.updateChannel(draft.id, payload);
        toast.success('Channel updated');
      } else {
        await automation.createChannel(payload);
        toast.success('Channel created');
      }
      setDraft(null);
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save the channel'));
    } finally {
      setSaving(false);
    }
  };

  const verify = async (id: number) => {
    try {
      const result = await automation.verifyChannel(id);
      if (result.ok) {
        const who = result.page?.name ? `"${result.page.name}"` : `page ${result.page?.id}`;
        toast.success(`Token is valid for ${who}`);
        // A token minted from the Messenger use case can send and receive but
        // cannot read page details. That is fine now and a problem later, so say
        // so rather than letting it look like a clean pass.
        if (result.note) toast.warning(result.note, 9000);
      } else {
        toast.error(result.warning || result.error || 'Token check failed');
      }
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const subscribe = async (id: number) => {
    try {
      const result = await automation.subscribeChannel(id);
      if (result.ok) toast.success('Page subscribed to comment and message webhooks');
      else toast.error(result.error || 'Subscription failed');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const remove = async (channel: AutomationChannel) => {
    if (!window.confirm(`Delete "${channel.name}"? Its conversations and rules go too.`)) return;
    try {
      await automation.deleteChannel(channel.id);
      toast.success('Channel deleted');
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const publish = async () => {
    if (!postDraft?.message.trim()) return;
    try {
      const result = await automation.publishPost(postDraft.channelId, postDraft.message);
      if (result.ok) {
        toast.success('Post published');
        setPostDraft(null);
      } else {
        toast.error(result.error || 'Publish failed');
      }
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <AutomationLayout
      title="Channels"
      subtitle="Each Facebook Page or Instagram account the automation is connected to."
      actions={
        <>
          <button onClick={load} className={buttonSecondaryClass} disabled={loading}>
            <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          {canManage && (
            <button onClick={() => setDraft({ ...EMPTY_DRAFT })} className={buttonClass}>
              <FaPlus /> Add channel
            </button>
          )}
        </>
      }
    >
      {draft && (
        <Card
          title={draft.id ? `Edit "${draft.name}"` : 'New channel'}
          className="mb-6"
          actions={
            <>
              <button onClick={() => setDraft(null)} className={buttonSecondaryClass}>
                Cancel
              </button>
              <button onClick={save} className={buttonClass} disabled={saving}>
                {saving ? 'Saving…' : 'Save channel'}
              </button>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Display name">
              <input
                className={inputClass}
                value={draft.name ?? ''}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Handsome Man BD"
              />
            </Field>

            <Field label="Platform">
              <select
                className={inputClass}
                value={draft.platform ?? 'facebook'}
                onChange={(e) => setDraft({ ...draft, platform: e.target.value as any })}
              >
                <option value="facebook">Facebook Page</option>
                <option value="instagram">Instagram</option>
              </select>
            </Field>

            <Field label="Page ID" hint="Meta sends this as entry[].id on every webhook">
              <input
                className={inputClass}
                value={draft.page_id ?? ''}
                onChange={(e) => setDraft({ ...draft, page_id: e.target.value })}
                placeholder="100000000000001"
              />
            </Field>

            <Field
              label="Page access token"
              hint={
                draft.id
                  ? 'Leave blank to keep the saved token. It is never shown back.'
                  : 'From the Meta App Dashboard. Stored encrypted at rest by your database.'
              }
            >
              <input
                type="password"
                className={inputClass}
                value={draft.page_access_token ?? ''}
                onChange={(e) => setDraft({ ...draft, page_access_token: e.target.value })}
                placeholder={draft.id ? '•••••••• (unchanged)' : 'EAAG...'}
              />
            </Field>

            <Field
              label="Mode"
              hint="Shadow writes the reply but sends nothing — use it for the first week."
            >
              <select
                className={inputClass}
                value={draft.mode ?? 'shadow'}
                onChange={(e) => setDraft({ ...draft, mode: e.target.value as any })}
              >
                <option value="off">Off — receive only</option>
                <option value="shadow">Shadow — decide, do not send</option>
                <option value="live">Live — actually reply</option>
              </select>
            </Field>

            <Field label="Brand (storefront)" hint="Scopes product lookups to this brand's catalogue">
              <select
                className={inputClass}
                value={draft.storefront_id ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    storefront_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">All products (main TrustCart)</option>
                {storefronts.map((storefront) => (
                  <option key={storefront.id} value={storefront.id}>
                    {storefront.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Max auto-replies per thread per hour" hint="0 disables the cap">
              <input
                type="number"
                min={0}
                max={100}
                className={inputClass}
                value={draft.max_replies_per_thread_hour ?? 3}
                onChange={(e) =>
                  setDraft({ ...draft, max_replies_per_thread_hour: Number(e.target.value) })
                }
              />
            </Field>

            <div className="md:col-span-2">
              <Field
                label="Products this page is mainly about"
                hint='Used only when the customer names no product. "dam koto?" names none — without these the bot has no price it is allowed to state and hands the question to a person.'
              >
                <FeaturedProducts
                  ids={draft.featured_product_ids ?? []}
                  onChange={(next) => setDraft({ ...draft, featured_product_ids: next })}
                />
              </Field>
            </div>

            <Field label="Signature" hint="Appended to every reply, e.g. — TrustCart">
              <input
                className={inputClass}
                value={draft.signature ?? ''}
                onChange={(e) => setDraft({ ...draft, signature: e.target.value })}
              />
            </Field>

            <div className="md:col-span-2">
              <Field
                label="Brand voice (persona)"
                hint="Extra instructions given to the AI for this page only"
              >
                <textarea
                  className={`${inputClass} min-h-[80px]`}
                  value={draft.persona ?? ''}
                  onChange={(e) => setDraft({ ...draft, persona: e.target.value })}
                  placeholder="Friendly, informal Bangla. Address customers as 'apu' or 'bhai'."
                />
              </Field>
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-4 text-sm text-slate-700">
              <Toggle
                label="Reply to comments"
                checked={draft.reply_to_comments !== false}
                onChange={(v) => setDraft({ ...draft, reply_to_comments: v })}
              />
              <Toggle
                label="Reply to Messenger"
                checked={draft.reply_to_messages !== false}
                onChange={(v) => setDraft({ ...draft, reply_to_messages: v })}
              />
              <Toggle
                label="Also send a private reply to commenters"
                checked={Boolean(draft.private_reply_to_comments)}
                onChange={(v) => setDraft({ ...draft, private_reply_to_comments: v })}
              />
              <Toggle
                label="Active"
                checked={draft.is_active !== false}
                onChange={(v) => setDraft({ ...draft, is_active: v })}
              />
            </div>
          </div>
        </Card>
      )}

      {postDraft && (
        <Card
          title="Publish a post"
          className="mb-6"
          actions={
            <>
              <button onClick={() => setPostDraft(null)} className={buttonSecondaryClass}>
                Cancel
              </button>
              <button onClick={publish} className={buttonClass}>
                Publish now
              </button>
            </>
          }
        >
          <textarea
            className={`${inputClass} min-h-[120px]`}
            value={postDraft.message}
            onChange={(e) => setPostDraft({ ...postDraft, message: e.target.value })}
            placeholder="What should the page post?"
          />
          <p className="mt-2 text-xs text-amber-600">
            This posts publicly on the page immediately. The channel must be in live mode.
          </p>
        </Card>
      )}

      {loading && channels.length === 0 ? (
        <EmptyState message="Loading…" />
      ) : channels.length === 0 ? (
        <EmptyState
          message="No channels yet"
          hint="Add the Page ID and its access token to start receiving comments and messages."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {channels.map((channel) => (
            <Card
              key={channel.id}
              title={channel.name}
              subtitle={`${channel.platform} · ${channel.page_id}`}
              actions={
                canManage && (
                  <>
                    <button onClick={() => verify(channel.id)} className={buttonSecondaryClass}>
                      <FaCheckCircle /> Verify
                    </button>
                    <button onClick={() => subscribe(channel.id)} className={buttonSecondaryClass}>
                      Subscribe
                    </button>
                    <button
                      onClick={() => setDraft({ ...channel, page_access_token: '' })}
                      className={buttonSecondaryClass}
                    >
                      Edit
                    </button>
                  </>
                )
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge value={channel.mode} />
                {!channel.is_active && <Badge value="off">inactive</Badge>}
                {channel.has_token ? (
                  <span className="text-xs text-emerald-600">token saved</span>
                ) : (
                  <span className="text-xs font-medium text-red-600">no token</span>
                )}
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <Detail label="Brand" value={channel.storefront_name || 'All products'} />
                <Detail label="Last event" value={formatWhen(channel.last_event_at)} />
                <Detail label="Comments" value={channel.reply_to_comments ? 'on' : 'off'} />
                <Detail label="Messenger" value={channel.reply_to_messages ? 'on' : 'off'} />
                <Detail
                  label="Reply cap"
                  value={
                    channel.max_replies_per_thread_hour > 0
                      ? `${channel.max_replies_per_thread_hour}/hour per thread`
                      : 'no cap'
                  }
                />
                <Detail label="Signature" value={channel.signature || '—'} />
              </dl>

              {canManage && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => setPostDraft({ channelId: channel.id, message: '' })}
                    className={buttonSecondaryClass}
                  >
                    <FaBullhorn /> Publish a post
                  </button>
                  <button onClick={() => remove(channel)} className={buttonDangerClass}>
                    <FaTrash /> Delete
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </AutomationLayout>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      <span>{label}</span>
    </label>
  );
}
