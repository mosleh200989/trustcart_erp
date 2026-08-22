import { useRouter } from 'next/router';
import HMProductGrid from '@/components/storefronts/handsomeman/HMProductGrid';

export default function HMCategory() {
  const router = useRouter();
  const slug = typeof router.query.slug === 'string' ? router.query.slug : undefined;
  if (!slug) return null;
  return <HMProductGrid categorySlug={slug} />;
}

// Server-rendered so _document can detect the storefront host and omit
// TrustCart branding metadata (static prerendering has no request context).
export async function getServerSideProps() {
  return { props: {} };
}
