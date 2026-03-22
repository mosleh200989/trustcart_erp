import { GetServerSideProps } from 'next';

/**
 * /register redirects to /customer/register (the canonical registration page).
 * Preserves query params like ?ref= for referral attribution.
 */
export const getServerSideProps: GetServerSideProps = async (context) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(context.query)) {
    if (typeof value === 'string') params.set(key, value);
  }
  const qs = params.toString();

  return {
    redirect: {
      destination: `/customer/register${qs ? `?${qs}` : ''}`,
      permanent: true,
    },
  };
};

export default function Register() {
  return null;
}
