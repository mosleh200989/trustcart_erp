import { isSystemMessage, classifySystemMessage } from './system-message';

/**
 * Every string below is real, taken from the imported Kasri corpus, with the
 * repeat count it actually had. They are dangerous precisely because they look
 * like house style by every mechanical measure — outbound, well-formed, and the
 * most repeated text on the page.
 */
describe('isSystemMessage', () => {
  it.each([
    ['You are responding to a user comment to a post on your Page. View comment.(https://facebook.com/reel/[NUMBER]/)', 'x394'],
    ['আপনি আপনার পৃষ্ঠাত একজন ব্যবহারকারী পোস্টে উত্তর দিয়েছেন৷ কমেন্ট দেখুন৷', 'x14'],
    ['Hi, MD! Please let us know how we can help you.', 'x44'],
    ['Hi MD! We wanted to follow up. Do you have any questions?', 'x44'],
    ['Auto-label added: Lead stage set to intake.', 'x54'],
    ['Sahab Ibn Jashim assigned this conversation to Sahab Ibn Jashim.', 'x17'],
    ['The calling window has been reset to 7 days from the end of the previous call.', 'x23'],
    ["This account can't receive your message because they don't allow new message requests from everyone.", 'x21'],
  ])('rejects %s (%s in the corpus)', (text) => {
    expect(isSystemMessage(text)).toBe(true);
  });

  it('names the reason rather than silently dropping the message', () => {
    expect(classifySystemMessage('Hi, Jahangir! Please let us know how we can help you.').label).toBe(
      'meta_instant_reply',
    );
  });

  it.each([
    'আসসালামু আলাইকুম\n\nআপনার কোন ধরনের ব্যাথার জন্য আমাদের এই কাশরি তেল টি নিতে চাচ্ছেন?',
    'আপনার অর্ডারটি কনফার্ম করতে তথ্য গুলো দিন -\n\nনামঃ\nঠিকানা (গ্রাম, থানা, জেলা সহ):\nমোবাইল নাম্বারঃ',
    '⚫ কাসরি ওয়েল মূল্য - [PRICE] ডেলিভারী ফ্রী।',
    'কতদিন যাবৎ আপনার ব্যথার সমস্যা এবং আপনার বয়স কত?',
    'আমাদের স্ট্যান্ডার্ড ডেলিভারি টাইম ফ্রেম নিম্নরূপ:\n\nঢাকার ভিতর - 1-2 দিন\nঢাকার বাইরে - 2-3 দিন',
  ])('keeps genuine agent writing: %s', (text) => {
    expect(isSystemMessage(text)).toBe(false);
  });

  it('does not mistake a greeting that merely starts with Hi for an auto-reply', () => {
    // The Meta pattern is anchored and shaped; a human "Hi bhai, ..." must survive.
    expect(isSystemMessage('Hi bhai, apnar order ta confirm kore dilam.')).toBe(false);
  });

  it('treats empty input as not a system message rather than throwing', () => {
    expect(isSystemMessage('')).toBe(false);
    expect(isSystemMessage(null)).toBe(false);
  });
});
