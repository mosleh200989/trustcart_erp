import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AutomationHistoryMessage } from '../entities/automation-history-message.entity';
import { maskMessage, normalizeBengaliDigits } from './message-masker';
import { isSystemMessage } from './system-message';

/**
 * Intents, in the order a Kasri conversation actually moves.
 *
 * Ranking purely by frequency would return thirty variants of the order form,
 * because that is the single most-repeated thing the team writes. Bucketing
 * first and taking the best of each bucket is what makes the resulting set cover
 * a whole conversation rather than its most common step.
 *
 * Keywords, not a classifier: this corpus is formulaic enough that keywords are
 * accurate here, and a rule you can read and correct beats a model you cannot.
 */
const INTENTS: Array<{ key: string; label: string; patterns: RegExp[] }> = [
  {
    key: 'greeting',
    label: 'Opening / greeting',
    patterns: [/আসসালামু আলাইকুম/, /স্বাগতম/, /ওয়ালাইকুম/],
  },
  {
    key: 'qualify',
    label: 'Qualifying the customer',
    patterns: [/কোন ধরনের ব্যাথা/, /কোন ধরনের ব্যথা/, /কতদিন/, /বয়স/, /ডাক্তার/, /বিস্তারিত জানাবেন/],
  },
  {
    key: 'price',
    label: 'Price and offer',
    patterns: [/মূল্য/, /প্রাইস/, /অফার/, /কম্বো/, /\[PRICE\]/],
  },
  {
    key: 'order_collect',
    label: 'Collecting order details',
    patterns: [/অর্ডার.{0,20}কনফার্ম/, /নামঃ/, /নাম\s*:/, /ঠিকানা/, /মোবাইল নাম্বার/],
  },
  {
    key: 'usage',
    label: 'How to use the product',
    patterns: [/ব্যবহারের পদ্ধতি/, /খাওয়ার নিয়ম/, /সেবন/, /ম্যাসাজ/, /মালিস/],
  },
  {
    key: 'delivery',
    label: 'Delivery time and charge',
    patterns: [/ডেলিভারি/, /ডেলিভারী/, /ঢাকার ভিতর/, /ঢাকার বাইরে/, /ক্যাশ অন/],
  },
  {
    key: 'reassure',
    label: 'Reassurance and objections',
    patterns: [/ইনশাআল্লাহ/, /স্থায়ীভাবে/, /বিশ্বাস/, /অরিজিনাল/, /আসল/, /গ্যারান্টি/],
  },
  {
    key: 'closing',
    label: 'Confirmation and closing',
    patterns: [/ধন্যবাদ/, /কনফার্ম করা হয়েছে/, /প্রতিনিধি/, /যোগাযোগ করবে/, /মতামত/],
  },
];

/** One starred reply, as the system prompt sees it. */
export type StyleExample = {
  id: number;
  text: string;
  intent: string;
};

/**
 * A run of digits this long in a masked message is a figure the masker missed.
 *
 * Three, not four: the NUMBER rule only sweeps up runs of four or more, so a
 * three-digit price that never sat next to a currency word — "850 er jonno" —
 * survives import looking exactly like ordinary text.
 */
const LEAKED_FIGURE = /\d{3,}/;

export type ExampleCandidate = {
  id: number;
  text: string;
  frequency: number;
  intent: string;
  intentLabel: string;
};

@Injectable()
export class HistoryCurationService {
  private readonly logger = new Logger(HistoryCurationService.name);

  constructor(
    @InjectRepository(AutomationHistoryMessage)
    private readonly messageRepository: Repository<AutomationHistoryMessage>,
  ) {}

  /**
   * Re-runs the current masker over already-stored text.
   *
   * The original message is deliberately never kept, so a masker fix cannot be
   * applied by re-importing. It can be applied to what was stored: a figure that
   * leaked is still sitting there in plain digits, and an improved pattern
   * catches it now. Masking is safe to repeat — existing placeholders contain no
   * digits, so nothing is masked twice.
   */
  async recleanStored(): Promise<{ scanned: number; updated: number; leaksFound: number }> {
    let scanned = 0;
    let updated = 0;
    let leaksFound = 0;
    const pageSize = 500;

    for (let offset = 0; ; offset += pageSize) {
      const batch = await this.messageRepository.find({
        order: { id: 'ASC' },
        skip: offset,
        take: pageSize,
      });
      if (batch.length === 0) break;

      for (const message of batch) {
        scanned += 1;
        if (!message.text) continue;

        const remasked = maskMessage(message.text);
        if (remasked.text !== message.text) {
          const before = Object.values(message.masked_counts ?? {}).reduce((a, b) => a + b, 0);
          const after = Object.values(remasked.counts).reduce((a, b) => a + b, 0);
          if (after > 0) leaksFound += after;

          message.text = remasked.text;
          message.masked_counts = {
            ...(message.masked_counts ?? {}),
            ...Object.fromEntries(
              Object.entries(remasked.counts).map(([k, v]) => [k, (message.masked_counts?.[k] ?? 0) + v]),
            ),
          };
          await this.messageRepository.save(message);
          updated += 1;
          void before;
        }
      }
    }

    this.logger.log(
      `Re-clean complete: scanned ${scanned}, updated ${updated}, ${leaksFound} figure(s) caught by improved patterns`,
    );
    return { scanned, updated, leaksFound };
  }

  private classify(text: string): { key: string; label: string } | null {
    for (const intent of INTENTS) {
      if (intent.patterns.some((p) => p.test(text))) {
        return { key: intent.key, label: intent.label };
      }
    }
    return null;
  }

  /**
   * Proposes a spread of style examples.
   *
   * Deduplicated by normalised text, so a line the team sent seven hundred times
   * appears once — but its count is kept, because repetition is the strongest
   * available signal that a phrasing is the house style rather than one agent's
   * habit.
   */
  async suggestExamples(perIntent = 4): Promise<{
    candidates: ExampleCandidate[];
    rejected: { system: number; tooShort: number; mostlyMasked: number; unclassified: number };
  }> {
    const rows: Array<{ id: number; text: string; freq: number }> = await this.messageRepository
      .createQueryBuilder('m')
      .select('MIN(m.id)', 'id')
      .addSelect('MIN(m.text)', 'text')
      .addSelect('COUNT(*)::int', 'freq')
      .where('m.direction = :d', { d: 'outbound' })
      .andWhere('m.text IS NOT NULL')
      .groupBy("lower(regexp_replace(m.text, '\\s+', ' ', 'g'))")
      .orderBy('COUNT(*)', 'DESC')
      .limit(1500)
      .getRawMany();

    const rejected = { system: 0, tooShort: 0, mostlyMasked: 0, unclassified: 0 };
    const buckets = new Map<string, ExampleCandidate[]>();

    for (const row of rows) {
      const text = String(row.text ?? '').trim();

      if (isSystemMessage(text)) {
        rejected.system += 1;
        continue;
      }

      const collapsed = text.replace(/\s+/g, ' ');
      if (collapsed.length < 40 || collapsed.length > 320) {
        rejected.tooShort += 1;
        continue;
      }

      // A message that is mostly placeholders teaches the model to emit
      // placeholders rather than sentences.
      const placeholderChars = (collapsed.match(/\[[A-Z]+\]/g) ?? []).join('').length;
      if (placeholderChars / collapsed.replace(/\s/g, '').length > 0.4) {
        rejected.mostlyMasked += 1;
        continue;
      }

      const intent = this.classify(collapsed);
      if (!intent) {
        rejected.unclassified += 1;
        continue;
      }

      const list = buckets.get(intent.key) ?? [];
      // Near-duplicates survive normalisation (different spacing, a stray
      // full stop). Skip anything whose first 40 characters already appear.
      const head = collapsed.slice(0, 40);
      if (list.some((c) => c.text.replace(/\s+/g, ' ').slice(0, 40) === head)) continue;
      if (list.length >= perIntent) continue;

      list.push({
        id: Number(row.id),
        text,
        frequency: Number(row.freq),
        intent: intent.key,
        intentLabel: intent.label,
      });
      buckets.set(intent.key, list);
    }

    // Emit in conversation order so the set reads as a flow.
    const candidates = INTENTS.flatMap((intent) => buckets.get(intent.key) ?? []);
    return { candidates, rejected };
  }

  /**
   * The starred replies for one channel, ready to paste into the system prompt.
   *
   * Emitted in conversation order — greeting, qualifying, price, order, and so
   * on — so the block reads as a flow rather than a bag of sentences, which is
   * what teaches the model where in a conversation each shape belongs.
   *
   * Anything still carrying a run of digits is dropped here rather than merely
   * unlikely to appear. Masking happens at import, so a leak means the masker
   * had a gap when that row was written; re-running the masker fixes the store,
   * but this filter means a gap discovered tomorrow cannot have been quoted to
   * a customer today.
   */
  async styleExamples(channelId: number, max: number): Promise<StyleExample[]> {
    const limit = Number.isFinite(max) && max > 0 ? Math.floor(max) : 24;

    const rows = await this.messageRepository.find({
      where: { channel_id: channelId, is_example: true, direction: 'outbound' },
      order: { id: 'ASC' },
    });

    const kept: StyleExample[] = [];
    let leaked = 0;

    for (const row of rows) {
      const text = String(row.text ?? '').trim();
      if (!text) continue;

      if (LEAKED_FIGURE.test(normalizeBengaliDigits(text))) {
        leaked += 1;
        continue;
      }

      const intent = this.classify(text.replace(/\s+/g, ' '));
      kept.push({ id: row.id, text, intent: intent?.key ?? 'other' });
    }

    if (leaked > 0) {
      this.logger.warn(
        `${leaked} starred example(s) still contain a figure and were withheld from the prompt. ` +
          'Run the re-clean on the History import page.',
      );
    }

    const order = new Map(INTENTS.map((intent, index) => [intent.key, index]));
    kept.sort((a, b) => (order.get(a.intent) ?? 99) - (order.get(b.intent) ?? 99));

    return kept.slice(0, limit);
  }

  /** Marks exactly this set as the examples, clearing any previous selection. */
  async applyExamples(ids: number[]): Promise<{ selected: number }> {
    await this.messageRepository.update({ is_example: true }, { is_example: false });
    if (ids.length > 0) {
      await this.messageRepository.update({ id: In(ids) }, { is_example: true });
    }
    return { selected: ids.length };
  }
}
