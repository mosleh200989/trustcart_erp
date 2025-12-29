interface Banner {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  button_text: string;
  button_link: string;
  image_url: string;
  background_color: string;
  text_color: string;
}

interface Props {
  banners: Banner[];
}

export default function SideBanner({ banners }: Props) {
  if (!banners || banners.length === 0) return null;

  // Show the first side banner
  const banner = banners[0];

  return (
    <a
      href={banner.button_link || '#'}
      className="block rounded-lg overflow-hidden shadow-lg h-96 relative cursor-pointer group"
    >
      {/* Full Banner Image */}
      <img
        src={banner.image_url}
        alt={banner.title}
        crossOrigin="anonymous"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        onError={(e) => {
          console.error('Side banner image failed to load:', banner.image_url);
        }}
      />
    </a>
  );
}
