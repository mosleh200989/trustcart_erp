import apiClient from '@/services/api';

export interface LandingPageOption {
  id: number | null;
  slug: string;
  title: string;
  value: string;
  label: string;
}

export async function fetchLandingPageOptions(): Promise<LandingPageOption[]> {
  const response = await apiClient.get('/sales/landing-page-options');
  const rows = Array.isArray(response.data) ? response.data : [];

  return rows
    .map((row: any) => {
      const slug = String(row?.slug ?? row?.value ?? '').trim();
      const title = String(row?.title ?? row?.label ?? slug).trim();
      const label = String(row?.label ?? (title && title !== slug ? `${title} (${slug})` : slug)).trim();
      return {
        id: row?.id != null ? Number(row.id) : null,
        slug,
        title,
        value: slug,
        label,
      };
    })
    .filter((row) => row.slug);
}
