import { resolveAnnouncementImage, badgeColorClasses, type Announcement } from "@/lib/announcements";

// Tarjeta de anuncio genérica (mismo estilo que los anuncios fijos del inicio):
// badge arriba a la derecha, título y mensaje abajo a la izquierda sobre la foto.
export function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const bg = resolveAnnouncementImage(announcement.image_ref);
  const badge = badgeColorClasses(announcement.badge_color);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-soft min-h-[96px]">
      {bg && <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/60 to-black/85" />
      <div className="relative flex min-h-[96px] flex-col justify-end px-4 py-3 text-white">
        {announcement.badge_text && (
          <span className={`absolute top-3 right-3 inline-flex items-center rounded-full px-2 py-0.5 ${badge.bg} ${badge.text}`}>
            <span className="text-[9px] font-black uppercase tracking-widest">{announcement.badge_text}</span>
          </span>
        )}
        <h2 className="display text-lg leading-tight pr-24">{announcement.title}</h2>
        {announcement.message && (
          <p className="text-xs text-white/85 mt-0.5 leading-snug max-w-[85%] whitespace-pre-line">{announcement.message}</p>
        )}
      </div>
    </div>
  );
}
