import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { setPendingReferralAttribution } from '@/utils/referralAttribution';

export default function ReferralRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const raw = router.query?.code;
    const code = typeof raw === 'string' ? raw.trim() : '';
    if (!router.isReady) return;

    if (code) {
      setPendingReferralAttribution({ code, channel: 'qr' });
      router.replace(`/register?ref=${encodeURIComponent(code)}`);
    } else {
      router.replace('/register');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-6">
        <div className="text-lg font-semibold text-gray-900">Redirecting…</div>
        <div className="text-sm text-gray-600 mt-2">Preparing your referral registration.</div>
      </div>
    </div>
  );
}
