// Handsome Man — order confirmation
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import HMLayout, { Reveal, HM_COLORS } from '@/components/storefronts/handsomeman/HMLayout';
import { HMStorefront, fetchHMConfig } from '@/components/storefronts/handsomeman/hm';

export default function HMThankYou() {
  const router = useRouter();
  const orderId = typeof router.query.order === 'string' ? router.query.order : null;
  const [config, setConfig] = useState<HMStorefront | null>(null);

  useEffect(() => {
    fetchHMConfig().then(setConfig).catch(() => {});
  }, []);

  return (
    <HMLayout config={config} title="Order confirmed">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-32 sm:pt-44 pb-24 text-center">
        <Reveal>
          <div
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-8"
            style={{ border: `2px solid ${HM_COLORS.gold}` }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={HM_COLORS.gold} strokeWidth="2.5">
              <path d="M4 12.5l5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <h1 className="hm-display text-3xl sm:text-5xl font-semibold mb-4">
            Order <span className="hm-gold">Confirmed</span>
          </h1>
        </Reveal>

        <Reveal delay={200}>
          <p className="text-sm sm:text-base leading-relaxed mb-2" style={{ color: HM_COLORS.textDim }}>
            Thank you, boss. Your order has been received
            {orderId ? <> — reference <span className="hm-gold font-semibold">#{orderId}</span></> : null}.
          </p>
          <p className="text-sm sm:text-base leading-relaxed mb-10" style={{ color: HM_COLORS.textDim }}>
            Our team will call you shortly to confirm before dispatch. Payment is cash on delivery.
          </p>
        </Reveal>

        <Reveal delay={280}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/hm/products" className="hm-btn hm-btn-gold px-8 py-4 text-sm rounded-sm font-semibold">
              Continue Shopping
            </Link>
            {config?.contact_phone && (
              <a href={`tel:${config.contact_phone}`} className="hm-btn hm-btn-outline px-8 py-4 text-sm rounded-sm">
                Call us: {config.contact_phone}
              </a>
            )}
          </div>
        </Reveal>
      </div>
    </HMLayout>
  );
}
