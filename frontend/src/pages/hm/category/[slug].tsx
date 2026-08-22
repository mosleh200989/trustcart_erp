import { useRouter } from 'next/router';
import HMProductGrid from '@/components/storefronts/handsomeman/HMProductGrid';

export default function HMCategory() {
  const router = useRouter();
  const slug = typeof router.query.slug === 'string' ? router.query.slug : undefined;
  if (!slug) return null;
  return <HMProductGrid categorySlug={slug} />;
}
