type HeroVideoEmbedProps = {
  url?: string | null;
  title?: string;
  accentColor?: string;
  className?: string;
  frameClassName?: string;
};

const getYouTubeEmbedUrl = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const watchId = url.searchParams.get('v');
      if (watchId) return `https://www.youtube.com/embed/${watchId}`;

      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'embed' && parts[1]) return `https://www.youtube.com/embed/${parts[1]}`;
      if (parts[0] === 'shorts' && parts[1]) return `https://www.youtube.com/embed/${parts[1]}`;
    }
  } catch {
    return '';
  }

  return '';
};

const isDirectVideoUrl = (value?: string | null) => {
  const raw = String(value || '').trim().toLowerCase();
  return /\.(mp4|webm|ogg)(\?.*)?$/.test(raw);
};

export default function HeroVideoEmbed({
  url,
  title = 'Hero video',
  accentColor = '#16a34a',
  className = '',
  frameClassName = '',
}: HeroVideoEmbedProps) {
  const videoUrl = String(url || '').trim();
  if (!videoUrl) return null;

  const embedUrl = getYouTubeEmbedUrl(videoUrl);
  const showDirectVideo = !embedUrl && isDirectVideoUrl(videoUrl);

  if (!embedUrl && !showDirectVideo) return null;

  return (
    <div className={`mx-auto w-full max-w-4xl ${className}`}>
      <div
        className={`relative overflow-hidden rounded-2xl bg-black shadow-2xl ${frameClassName}`}
        style={{
          aspectRatio: '16 / 9',
          border: `3px solid ${accentColor}`,
          boxShadow: `0 24px 70px -28px ${accentColor}`,
        }}
      >
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <video
            src={videoUrl}
            title={title}
            className="absolute inset-0 h-full w-full bg-black object-contain"
            controls
            playsInline
            preload="metadata"
          />
        )}
      </div>
    </div>
  );
}
