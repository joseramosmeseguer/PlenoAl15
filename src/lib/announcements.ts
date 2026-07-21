// Fondos disponibles para los anuncios (los que ya existen en la web) + resolución
// de la imagen (preset por clave o URL subida a Storage), y colores de la badge.
import estadioClaro from "@/assets/EstadioNormalClaro.png";
import estadioOscuro from "@/assets/EstadioNormalOscuro.png";
import estadioEspana from "@/assets/EstadioSpain.png";
import estadioEspana1 from "@/assets/EstadioSpain1.png";
import estadioEpico from "@/assets/EstadioEpico1.png";
import estadioEpico2 from "@/assets/EstadioEpico2.png";
import estadioFutbol from "@/assets/Estadiofutbolfondo.png";
import balonPorteria from "@/assets/balonenporteria.webp";
import anuncio1 from "@/assets/Anuncio1.png";
import anuncio2 from "@/assets/Anuncio2.png";
import anuncio3 from "@/assets/Anuncio 3.png";
import spain2010 from "@/assets/spain-2010.jpg";
import celebracion2010 from "@/assets/CelebracionMundial2010.jpg";
import heroTrophy from "@/assets/hero-trophy.jpg";
import eliminatorias from "@/assets/Eliminatorias2.png";

export const ANNOUNCEMENT_IMAGES: { key: string; label: string; src: string }[] = [
  { key: "anuncio1", label: "Estadio · copa (izq)", src: anuncio1 },
  { key: "anuncio2", label: "Anuncio 2", src: anuncio2 },
  { key: "anuncio3", label: "Anuncio 3", src: anuncio3 },
  { key: "estadio_claro", label: "Estadio claro", src: estadioClaro },
  { key: "estadio_oscuro", label: "Estadio oscuro", src: estadioOscuro },
  { key: "estadio_espana", label: "Estadio España", src: estadioEspana },
  { key: "estadio_espana1", label: "Estadio España 2", src: estadioEspana1 },
  { key: "estadio_epico", label: "Estadio épico", src: estadioEpico },
  { key: "estadio_epico2", label: "Estadio épico 2", src: estadioEpico2 },
  { key: "estadio_futbol", label: "Estadio fútbol", src: estadioFutbol },
  { key: "balon_porteria", label: "Balón en portería", src: balonPorteria },
  { key: "spain_2010", label: "España 2010", src: spain2010 },
  { key: "celebracion_2010", label: "Celebración 2010", src: celebracion2010 },
  { key: "hero_trophy", label: "Trofeo", src: heroTrophy },
  { key: "eliminatorias", label: "Eliminatorias", src: eliminatorias },
];

// image_ref puede ser: clave de preset, URL subida (http…) o data URL.
export function resolveAnnouncementImage(imageRef?: string | null): string | undefined {
  if (!imageRef) return undefined;
  if (imageRef.startsWith("http") || imageRef.startsWith("data:")) return imageRef;
  return ANNOUNCEMENT_IMAGES.find((i) => i.key === imageRef)?.src;
}

export const BADGE_COLORS: { key: string; label: string; bg: string; text: string }[] = [
  { key: "red", label: "Rojo", bg: "bg-red-600", text: "text-white" },
  { key: "gold", label: "Dorado", bg: "bg-gold", text: "text-pitch-deep" },
  { key: "emerald", label: "Verde", bg: "bg-emerald-600", text: "text-white" },
  { key: "blue", label: "Azul", bg: "bg-blue-600", text: "text-white" },
  { key: "purple", label: "Morado", bg: "bg-purple-600", text: "text-white" },
  { key: "slate", label: "Gris", bg: "bg-slate-700", text: "text-white" },
];

export function badgeColorClasses(key?: string | null): { bg: string; text: string } {
  return BADGE_COLORS.find((c) => c.key === key) ?? BADGE_COLORS[0];
}

export type Announcement = {
  id: string;
  badge_text: string | null;
  badge_color: string | null;
  title: string;
  message: string | null;
  image_ref: string | null;
  visibility: "all" | "admins";
  starts_at: string | null;
  ends_at: string | null;
};

// ¿Está el anuncio activo ahora mismo según sus fechas?
export function isAnnouncementLive(a: Announcement, now = Date.now()): boolean {
  if (a.starts_at && new Date(a.starts_at).getTime() > now) return false;
  if (a.ends_at && new Date(a.ends_at).getTime() < now) return false;
  return true;
}
