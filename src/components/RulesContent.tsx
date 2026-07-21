import { BookOpen, Star, Sparkles, Trophy, Users, Clock } from "lucide-react";

export function RulesContent({ showHeader = true }: { showHeader?: boolean }) {
  return (
    <div className="space-y-5 max-w-3xl">
      {showHeader && (
        <div className="rounded-2xl bg-gradient-pitch text-primary-foreground p-5 shadow-soft">
          <div className="display text-3xl flex items-center gap-2"><BookOpen className="h-6 w-6" /> Reglas y puntuación</div>
          <p className="text-white/80 text-sm">Cómo funciona la quiniela del Mundial 2026.</p>
        </div>
      )}

      {/* Partidos */}
      <Section icon={<Trophy className="text-primary" />} title="Pronósticos de partidos">
        <Row label="Resultado correcto (1-X-2)" pts="1 pt" />
        <Row label="Marcador exacto" pts="3 pts" />
        <div className="mt-3 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Star className="h-4 w-4 text-gold fill-gold" />
            <span className="text-sm font-bold text-gold">Partidos PREMIUM</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">Incluyen todos los partidos de España, semifinales, final y otros marcados por el admin.</p>
          <Row label="Resultado correcto" pts="2 pts" />
          <Row label="Marcador exacto" pts="6 pts" />
        </div>
      </Section>

      {/* Pronósticos especiales */}
      <Section icon={<Sparkles className="text-gold" />} title="Pronósticos especiales">
        <p className="text-sm text-muted-foreground mb-3">
          Preguntas bonus con puntuaciones más altas. Están divididas en categorías (generales, fase de grupos, eliminatorias…). Cada una tiene su propio plazo.
        </p>
        <Row label="Preguntas de alta dificultad (campeón, jugadores…)" pts="10–15 pts" />
        <Row label="Preguntas de media dificultad (grupos, fases…)" pts="5–10 pts" />
        <Row label="Preguntas de baja dificultad" pts="5 pts" />
      </Section>

      {/* Plazos */}
      <Section icon={<Clock className="text-primary" />} title="Plazos importantes">
        <ul className="text-sm space-y-2 list-none">
          <li className="flex gap-2"><span className="text-gold font-bold shrink-0">⏰</span><span><strong>11 de junio</strong> — caducan la mayoría de pronósticos especiales (campeón, jugadores, etc.).</span></li>
          <li className="flex gap-2"><span className="text-gold font-bold shrink-0">⏰</span><span><strong>1h antes de cada partido</strong> — se cierra el pronóstico de ese partido. No se puede modificar una vez cerrado.</span></li>
          <li className="flex gap-2"><span className="text-gold font-bold shrink-0">⏰</span><span>Cada pronóstico especial muestra su propia fecha límite en la tarjeta.</span></li>
        </ul>
      </Section>

      {/* Ligas */}
      <Section icon={<Users className="text-primary" />} title="Ligas">
        <p className="text-sm text-muted-foreground mb-3">
          Tus pronósticos y puntos son <strong>globales</strong> — los mismos en todas las ligas. Las ligas no cambian lo que pronosticas ni cuántos puntos ganas, solo con quién te comparas. Si estás en tres ligas, tienes exactamente la misma puntuación en las tres.
        </p>
        <ul className="text-sm space-y-2 list-none">
          <li className="flex gap-2"><span>🌍</span><span><strong>Global</strong> — la clasificación con todos los participantes. Siempre visible.</span></li>
          <li className="flex gap-2"><span>➕</span><span><strong>Crear una liga</strong> — elige un nombre claro (tus amigos la buscarán por él) y comparte el código de 5 dígitos que se genera.</span></li>
          <li className="flex gap-2"><span>🔑</span><span><strong>Unirse a una liga</strong> — selecciona la liga y escribe el código exacto que te dio el creador.</span></li>
          <li className="flex gap-2"><span>👥</span><span>Puedes estar en un máximo de <strong>4 ligas</strong> creadas por ti.</span></li>
        </ul>
      </Section>

    </div>
  );
}

function Section({ icon, title, children }: any) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <h2 className="display text-2xl flex items-center gap-2 mb-3">{icon} {title}</h2>
      {children}
    </section>
  );
}

function Row({ label, pts }: { label: string; pts: string }) {
  return (
    <div className="flex items-center justify-between border-t border-border first:border-t-0 py-2 text-sm">
      <span>{label}</span>
      <span className="font-semibold text-primary">{pts}</span>
    </div>
  );
}
