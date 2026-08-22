import HMProductGrid from '@/components/storefronts/handsomeman/HMProductGrid';

export default function HMProducts() {
  return <HMProductGrid />;
}

// Server-rendered so _document can detect the storefront host and omit
// TrustCart branding metadata (static prerendering has no request context).
export async function getServerSideProps() {
  return { props: {} };
}
