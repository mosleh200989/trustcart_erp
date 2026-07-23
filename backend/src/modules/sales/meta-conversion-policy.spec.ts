import {
  ARABIAN_KHALTA_PIXEL_ID,
  HERBOLIN_PIXEL_ID,
  MAIN_TRUSTCART_PIXEL_ID,
  VESHOJ_PIXEL_ID,
  getMetaPixelIdForOrder,
  normalizeMetaFbc,
} from './meta-conversion-policy';

describe('Meta conversion policy', () => {
  it('excludes manual admin and agent orders', () => {
    expect(getMetaPixelIdForOrder({ orderSource: 'admin_panel' })).toBeNull();
    expect(getMetaPixelIdForOrder({ orderSource: 'agent_dashboard' })).toBeNull();
    expect(getMetaPixelIdForOrder({ orderSource: 'whatsapp' })).toBeNull();
  });

  it('excludes a staff-created order even when its copied source says landing page', () => {
    expect(getMetaPixelIdForOrder({
      orderSource: 'landing_page',
      createdBy: 174,
    }, 1)).toBeNull();
  });

  it('routes website orders only to the main pixel', () => {
    expect(getMetaPixelIdForOrder({
      orderSource: 'website',
      metaEventSourceUrl: 'https://trustcart.com.bd/checkout',
    })).toBe(MAIN_TRUSTCART_PIXEL_ID);
  });

  it('does not send localhost or unverified website orders to production pixels', () => {
    expect(getMetaPixelIdForOrder({
      orderSource: 'website',
      metaEventSourceUrl: 'http://localhost:3000/checkout',
    })).toBeNull();
    expect(getMetaPixelIdForOrder({ orderSource: 'website' })).toBeNull();
  });

  it('routes dedicated landing pages to exactly their dedicated pixel', () => {
    expect(getMetaPixelIdForOrder({
      orderSource: 'landing_page',
      utmSource: 'veshoj',
      metaEventSourceUrl: 'https://veshoj.site/',
    }))
      .toBe(VESHOJ_PIXEL_ID);
    expect(getMetaPixelIdForOrder({
      orderSource: 'landing_page',
      utmSource: 'arabiankhalta',
      metaEventSourceUrl: 'https://arabiankhalta.com/',
    }))
      .toBe(ARABIAN_KHALTA_PIXEL_ID);
    expect(getMetaPixelIdForOrder({
      orderSource: 'landing_page',
      utmSource: 'Harbora-kosthogut',
      metaEventSourceUrl: 'https://herbolin.com/',
    }))
      .toBe(HERBOLIN_PIXEL_ID);
  });

  it('uses the main pixel for ordinary TrustCart landing pages', () => {
    expect(getMetaPixelIdForOrder({
      orderSource: 'landing_page',
      metaEventSourceUrl: 'https://trustcart.com.bd/lp/ordinary-offer',
    })).toBe(MAIN_TRUSTCART_PIXEL_ID);
  });

  it('preserves an exact valid fbc value', () => {
    const fbc = 'fb.1.1784761200000.AbCdEf_123';
    expect(normalizeMetaFbc(fbc, 'AbCdEf_123')).toBe(fbc);
  });

  it('rebuilds fbc from the exact unmodified fbclid when they disagree', () => {
    expect(normalizeMetaFbc(
      'fb.1.1784761200000.old-click-id',
      'AbCdEf_123',
      new Date('2026-07-23T00:00:00.000Z'),
    )).toBe('fb.1.1784764800000.AbCdEf_123');
  });
});
