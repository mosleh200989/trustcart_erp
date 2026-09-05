import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AutomationFaq } from './entities/automation-faq.entity';
import { CreateFaqDto } from './dto/automation.dto';

/** What the AI is allowed to state about policy, alongside the ERP facts. */
export type FaqFact = {
  id: number;
  question: string;
  answer: string;
};

export type FaqMatch = {
  faq: AutomationFaq;
  score: number;
  /** Which signals fired, so the panel can explain the match. */
  matched: string[];
};

/**
 * Words too common to distinguish one question from another. Kept small and
 * shared across Bangla, Banglish and English because customers mix all three
 * inside a single sentence.
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'is', 'are', 'do', 'does', 'can', 'i', 'you',
  'my', 'me', 'we', 'to', 'of', 'in', 'on', 'for', 'how', 'what', 'when',
  'where', 'your', 'it', 'this', 'that', 'please', 'plz', 'ki', 'koto',
  'ache', 'achhe', 'ami', 'amar', 'apni', 'apnar', 'apnara', 'bhai', 'apu',
  'hoy', 'hobe', 'kore', 'korte', 'korbo', 'ta', 'te',
  'কি', 'কী', 'আমি', 'আমার', 'আপনি', 'আপনার', 'হবে', 'করতে', 'করব', 'এই', 'এর',
]);

/**
 * Splits text into comparable tokens.
 *
 * `\w` is ASCII-only in JavaScript, so splitting on it would shred every
 * Bengali word — the same trap that let `_850_ taka` through the masker.
 *
 * `\p{M}` is just as load-bearing as `\p{L}` here. Bengali vowel signs and the
 * virama (ি, ে, া, ্) are combining Marks, not Letters, so a class of letters
 * and numbers alone treats them as separators: "ডেলিভারি" comes back as
 * ["ড", "ল", "ভ", "র"] and no Bengali keyword can ever match.
 */
export function tokenize(text: string): string[] {
  return String(text ?? '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}\p{M}]+/u)
    .filter(Boolean);
}

/** Collapses whitespace and punctuation so a phrase can be searched as a substring. */
function normalizePhrase(text: string): string {
  return tokenize(text).join(' ');
}

/**
 * The answers a person wrote for questions the database cannot answer.
 *
 * Two consumers, deliberately:
 *
 *   - the reply brain, which can answer a confident match directly and never
 *     call a model at all — which is the only reason this layer does anything
 *     while the AI is switched off;
 *   - the AI prompt, which receives the active answers as policy facts so a
 *     question phrased in a way the matcher missed is still grounded.
 *
 * Answers are stated, never generated. Nothing here is learned from imported
 * history: history teaches tone, this table states policy.
 */
@Injectable()
export class AutomationFaqService {
  private readonly logger = new Logger(AutomationFaqService.name);

  constructor(
    @InjectRepository(AutomationFaq)
    private readonly faqRepository: Repository<AutomationFaq>,
  ) {}

  // ─── Scoring ─────────────────────────────────────────────────────────────

  /**
   * How well one answer fits an incoming message, from 0 to 1.
   *
   * A multi-word keyword ("koto din", "কত দিন") is a deliberate, specific
   * signal and scores full marks on its own. A single word is weaker, because
   * "delivery" appears in "delivery koto din" and "delivery charge koto" alike,
   * so one of those alone must not be enough to send a stated answer to a
   * customer — it needs a second signal.
   *
   * Pure and static so the thresholds can be tested without a database.
   */
  static score(
    faq: Pick<AutomationFaq, 'question' | 'keywords'>,
    text: string,
  ): { score: number; matched: string[] } {
    const haystack = normalizePhrase(text);
    if (!haystack) return { score: 0, matched: [] };

    const tokens = new Set(tokenize(text));
    const matched: string[] = [];
    let total = 0;

    const keywords = Array.isArray(faq.keywords) ? faq.keywords : [];
    for (const raw of keywords) {
      const phrase = normalizePhrase(String(raw ?? ''));
      if (!phrase) continue;

      if (phrase.includes(' ')) {
        // Both sides are single-space normalised, so padding the haystack makes
        // a plain `includes` word-boundary safe in every script.
        if (` ${haystack} `.includes(` ${phrase} `)) {
          total += 1;
          matched.push(phrase);
        }
        continue;
      }

      if (tokens.has(phrase)) {
        total += 0.6;
        matched.push(phrase);
      }
    }

    // The question's own wording is a weak signal — it helps a near-miss over
    // the line but cannot carry a match by itself.
    for (const word of new Set(tokenize(faq.question))) {
      if (word.length < 3 || STOP_WORDS.has(word)) continue;
      if (tokens.has(word) && !matched.includes(word)) {
        total += 0.25;
        matched.push(word);
      }
    }

    return { score: Math.min(1, total), matched };
  }

  /**
   * The single best answer for this message, or null.
   *
   * Ties go to the lower priority number, so a shop can decide which of two
   * equally plausible answers wins rather than depending on row order.
   */
  static bestMatch(faqs: AutomationFaq[], text: string, minScore: number): FaqMatch | null {
    let best: FaqMatch | null = null;

    for (const faq of faqs) {
      if (!faq.is_active) continue;
      const { score, matched } = AutomationFaqService.score(faq, text);
      if (score < minScore) continue;

      if (
        !best ||
        score > best.score ||
        (score === best.score && faq.priority < best.faq.priority)
      ) {
        best = { faq, score, matched };
      }
    }

    return best;
  }

  /**
   * The answers handed to the model as policy facts.
   *
   * Capped because this goes into every prompt: an unbounded list would grow
   * the cost of every single message as the panel fills up.
   */
  static toFacts(faqs: AutomationFaq[], max: number): FaqFact[] {
    const limit = Number.isFinite(max) && max > 0 ? Math.floor(max) : 20;
    return faqs
      .slice(0, limit)
      .map((faq) => ({ id: faq.id, question: faq.question, answer: faq.answer }));
  }

  // ─── Reads used by the reply path ────────────────────────────────────────

  /** Active answers for a channel plus the global ones, cheapest priority first. */
  async activeForChannel(channelId: number): Promise<AutomationFaq[]> {
    const [channelFaqs, globalFaqs] = await Promise.all([
      this.faqRepository.find({ where: { channel_id: channelId, is_active: true } }),
      this.faqRepository.find({ where: { channel_id: IsNull(), is_active: true } }),
    ]);

    return [...channelFaqs, ...globalFaqs].sort((a, b) => a.priority - b.priority);
  }

  /** Bumps the hit counter for an answer that was used. Best-effort. */
  async recordHit(id: number): Promise<void> {
    try {
      await this.faqRepository.increment({ id }, 'hit_count', 1);
      await this.faqRepository.update({ id }, { last_hit_at: new Date() });
    } catch (error: any) {
      this.logger.debug(`Could not record hit for FAQ ${id}: ${error?.message}`);
    }
  }

  // ─── Panel CRUD ──────────────────────────────────────────────────────────

  async list(channelId?: number): Promise<AutomationFaq[]> {
    const query = this.faqRepository
      .createQueryBuilder('f')
      .orderBy('f.priority', 'ASC')
      .addOrderBy('f.id', 'ASC');

    if (channelId) {
      query.where('(f.channel_id = :channelId OR f.channel_id IS NULL)', { channelId });
    }

    return query.getMany();
  }

  private validate(dto: Partial<CreateFaqDto>): void {
    if (!String(dto.question ?? '').trim()) {
      throw new BadRequestException('An FAQ needs a question');
    }
    if (!String(dto.answer ?? '').trim()) {
      throw new BadRequestException('An FAQ needs an answer');
    }

    // The answer is sent verbatim. A template placeholder would arrive at the
    // customer as literal braces, so it is refused here rather than in front
    // of them — a rule is the right tool when the reply needs live data.
    if (/\{\{\s*[a-z_]+\s*\}\}/i.test(String(dto.answer ?? ''))) {
      throw new BadRequestException(
        'FAQ answers are sent word for word and cannot contain {{placeholders}}. ' +
          'Use a rule if the reply needs live data.',
      );
    }
  }

  async create(dto: CreateFaqDto): Promise<AutomationFaq> {
    this.validate(dto);
    return this.faqRepository.save(
      this.faqRepository.create({
        ...dto,
        channel_id: dto.channel_id ?? null,
        keywords: dto.keywords ?? [],
      }),
    );
  }

  async update(id: number, dto: Partial<CreateFaqDto>): Promise<AutomationFaq> {
    const faq = await this.faqRepository.findOne({ where: { id } });
    if (!faq) throw new NotFoundException('FAQ not found');

    this.validate({ ...faq, ...dto });

    Object.assign(faq, dto);
    if (dto.channel_id === null) faq.channel_id = null;
    return this.faqRepository.save(faq);
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const result = await this.faqRepository.delete({ id });
    if (!result.affected) throw new NotFoundException('FAQ not found');
    return { deleted: true };
  }

  /** Dry-run: which answer would fire for this text, and how strongly. */
  async test(
    channelId: number,
    text: string,
    minScore: number,
  ): Promise<{
    best: { id: number; question: string; answer: string; score: number; matched: string[] } | null;
    considered: Array<{ id: number; question: string; score: number }>;
  }> {
    const faqs = await this.activeForChannel(channelId);
    const best = AutomationFaqService.bestMatch(faqs, text, minScore);

    const considered = faqs
      .map((faq) => ({
        id: faq.id,
        question: faq.question,
        score: Number(AutomationFaqService.score(faq, text).score.toFixed(2)),
      }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score);

    return {
      best: best
        ? {
            id: best.faq.id,
            question: best.faq.question,
            answer: best.faq.answer,
            score: Number(best.score.toFixed(2)),
            matched: best.matched,
          }
        : null,
      considered,
    };
  }
}
