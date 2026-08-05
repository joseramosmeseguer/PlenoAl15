// Banderas de paises del Mundial — ya no se usan (juego de clubes),
// se mantiene la funcion para no romper los componentes de eliminatorias
// que aun la importan.
export const FLAG_MAP: Record<string, string> = {};

export function getFlagUrl(code: string | null | undefined): string | null {
  if (!code) return null;
  return FLAG_MAP[code.toUpperCase()] ?? null;
}
