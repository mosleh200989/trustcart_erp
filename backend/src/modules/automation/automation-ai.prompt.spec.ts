import { AutomationAiService } from './automation-ai.service';
import { createAiProvider, resolveModel, normalizeProviderName } from './ai/ai-provider.factory';

jest.mock('./ai/ai-provider.factory');

/**
 * What actually reaches the model.
 *
 * The whole grounding design lives in this one string: ERP rows and FAQ answers
 * are facts the reply may state, the starred history is voice it may copy and
 * nothing more. Every other test in this module checks a piece in isolation —
 * this one checks that the pieces arrive assembled, and labelled, in the prompt.
 */

const ERP = {
  products: [{ id: 7, name: 'Kasri Oil', price: 850, salePrice: 699 }],
  orders: [],
  customerId: null,
  customerName: null,
};

const SETTINGS = {
  enabled: true,
  provider: 'anthropic',
  model: 'claude-opus-5',
  max_tokens: 512,
  effort: 'low',
  json_mode: true,
  min_confidence: 0.6,
  history_turns: 8,
  system_prompt: 'You are a polite assistant.',
} as any;

function setup() {
  const complete = jest.fn(async () => ({
    text: '{"reply":"ok","confidence":0.9,"escalate":false,"reason":null}',
    usage: null,
    refusal: null,
  }));

  (createAiProvider as jest.Mock).mockReturnValue({
    configurationError: () => null,
    complete,
  });
  (resolveModel as jest.Mock).mockReturnValue('claude-opus-5');
  (normalizeProviderName as jest.Mock).mockReturnValue('anthropic');

  return { service: new AutomationAiService(), complete };
}

async function promptFor(options: Record<string, any> = {}): Promise<string> {
  const { service, complete } = setup();

  await service.generateReply({
    settings: SETTINGS,
    persona: null,
    channelName: 'Kasri Oil',
    incomingText: 'dam koto?',
    history: [],
    erp: ERP as any,
    threadType: 'message',
    ...options,
  });

  return (complete.mock.calls[0] as any[])[0].system as string;
}

beforeEach(() => jest.clearAllMocks());

describe('the assembled system prompt', () => {
  it('states the live price from the ERP, not from anywhere else', async () => {
    const prompt = await promptFor();
    expect(prompt).toContain('SHOP FACTS');
    expect(prompt).toContain('699 BDT (was 850 BDT)');
  });

  it('puts no stock information into the facts the reply may state', async () => {
    // Stock is company-internal. ProductFact has no such field, so this checks
    // that nothing reintroduced one further up. Scoped to the facts section:
    // the output contract mentions stock precisely to forbid it, which is the
    // opposite problem.
    const prompt = await promptFor({
      faqs: [{ id: 1, question: 'Delivery?', answer: 'One to two days.' }],
    });

    const facts = prompt.slice(
      prompt.indexOf('--- SHOP FACTS'),
      prompt.indexOf('--- END SHOP FACTS ---'),
    );

    expect(facts.toLowerCase()).not.toContain('stock');
    expect(facts).toContain('Kasri Oil');
  });

  it('includes FAQ answers as policy the reply may state', async () => {
    const prompt = await promptFor({
      faqs: [{ id: 1, question: 'How long does delivery take?', answer: 'Inside Dhaka 1-2 days.' }],
    });

    expect(prompt).toContain('Shop policy, written by the team');
    expect(prompt).toContain('Inside Dhaka 1-2 days.');
  });

  it('includes the starred replies, fenced off as voice rather than fact', async () => {
    const prompt = await promptFor({
      styleExamples: [{ id: 87, text: 'আসসালামু আলাইকুম', intent: 'greeting' }],
    });

    expect(prompt).toContain('HOW OUR TEAM WRITES');
    expect(prompt).toContain('1. আসসালামু আলাইকুম');
  });

  it('tells the model what the placeholders in those replies are', async () => {
    // A model shown "eta [PRICE] tk" and told nothing will send a customer the
    // literal word [PRICE]. This warning is the only thing preventing that.
    const prompt = await promptFor({
      styleExamples: [{ id: 1, text: 'কাসরি ওয়েল মূল্য - [PRICE]', intent: 'price' }],
    });

    expect(prompt).toContain('Never write a placeholder in a reply');
    expect(prompt).toContain('out of date');
  });

  it('omits the voice block entirely when nothing is starred', async () => {
    // Not an empty heading: an empty section invites the model to fill it.
    const prompt = await promptFor({ styleExamples: [] });
    expect(prompt).not.toContain('HOW OUR TEAM WRITES');
  });

  it('keeps the facts and the voice in separate, labelled sections', async () => {
    const prompt = await promptFor({
      faqs: [{ id: 1, question: 'Delivery?', answer: 'One to two days.' }],
      styleExamples: [{ id: 2, text: 'আসসালামু আলাইকুম', intent: 'greeting' }],
    });

    expect(prompt.indexOf('--- SHOP FACTS')).toBeLessThan(prompt.indexOf('--- END SHOP FACTS ---'));
    expect(prompt.indexOf('--- END SHOP FACTS ---')).toBeLessThan(
      prompt.indexOf('--- HOW OUR TEAM WRITES'),
    );
  });

  it('still forbids stating a figure that is not in SHOP FACTS', async () => {
    const prompt = await promptFor({
      styleExamples: [{ id: 1, text: 'দাম [PRICE]', intent: 'price' }],
    });

    expect(prompt).toContain('present in the SHOP FACTS section');
  });
});
