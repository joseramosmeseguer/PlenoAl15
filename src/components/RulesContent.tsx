import { BookOpen, Trophy, Lock, Users } from "lucide-react";

export function RulesContent({ showHeader = true }: { showHeader?: boolean }) {
  return (
    <div className="space-y-5 max-w-3xl">
      {showHeader && (
        <div className="rounded-2xl bg-gradient-pitch text-primary-foreground p-5 shadow-soft">
          <div className="display text-3xl flex items-center gap-2"><BookOpen className="h-6 w-6" /> Reglas</div>
          <p className="text-white/80 text-sm">Cómo se puntúa en PlenoAl15.</p>
        </div>
      )}

      <Section icon={<Trophy className="text-primary" />} title="Puntos por partido">
        <Row label="Partido normal — resultado (1X2)" pts="5 pts" />
        <Row label="Partido normal — marcador exacto" pts="15 pts" />
        <div className="mt-3 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
          <p className="text-sm font-bold text-gold mb-2">Partidos Premium</p>
          <Row label="Resultado" pts="10 pts" />
          <Row label="Marcador exacto" pts="30 pts" />
        </div>
        <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3">
          <p className="text-sm font-bold text-red-500 mb-2">Partidos Mega Premium</p>
          <Row label="Resultado" pts="15 pts" />
          <Row label="Marcador exacto" pts="45 pts" />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          El admin marca qué partidos son Premium o Mega Premium; se ven señalados en Calendario y Pronósticos.
        </p>
      </Section>

      <Section icon={<Lock className="text-primary" />} title="Cierre de pronósticos">
        <p className="text-sm text-muted-foreground">
          Los pronósticos se cierran <strong>1 hora antes</strong> del inicio de cada partido. A partir de ese
          momento puedes ver el partido pero no cambiar tu pronóstico.
        </p>
      </Section>

      <Section icon={<Users className="text-primary" />} title="Ligas">
        <p className="text-sm text-muted-foreground mb-3">
          Tus pronósticos y tus puntos son los mismos en todas las ligas — las ligas solo cambian con quién te
          comparas, no cuánto puntúas.
        </p>
        <ul className="text-sm space-y-2 list-none text-muted-foreground">
          <li><strong className="text-foreground">Crear una liga</strong> — le pones un nombre y compartes el código de 5 dígitos que se genera.</li>
          <li><strong className="text-foreground">Unirse a una liga</strong> — introduces el código de 5 dígitos que te dio el creador.</li>
          <li>Puedes crear hasta <strong className="text-foreground">4 ligas</strong>.</li>
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
