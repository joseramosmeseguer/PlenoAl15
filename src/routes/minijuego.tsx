import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Gamepad2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { useBonusQuestions, useBonusPredictions, useTeams, useMatches } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { BonusCard } from "@/components/BonusCard";

export const Route = createFileRoute("/minijuego")({
  component: Minijuego,
  head: () => ({ meta: [{ title: "Minijuego · El Mundial" }] }),
});

function Minijuego() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-pitch text-white p-5 shadow-soft">
        <div className="display text-3xl flex items-center gap-2">
          <Gamepad2 className="h-6 w-6 text-gold" /> Minijuego
        </div>
        <p className="text-white/80 text-sm">Pequeños retos extra durante el torneo.</p>
      </div>

      <Tabs defaultValue="diaria" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="diaria">Pregunta diaria</TabsTrigger>
          <TabsTrigger value="quiniela">Quiniela</TabsTrigger>
          <TabsTrigger value="vs">VS</TabsTrigger>
        </TabsList>
        <TabsContent value="diaria" className="mt-4">
          <MinijuegoSection location="minijuego_pregunta_diaria" emptyMsg="No hay pregunta diaria activa." />
        </TabsContent>
        <TabsContent value="quiniela" className="mt-4">
          <MinijuegoSection location="minijuego_quiniela" emptyMsg="Sin quiniela activa." />
        </TabsContent>
        <TabsContent value="vs" className="mt-4">
          <MinijuegoSection location="minijuego_vs" emptyMsg="Sin retos VS activos." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MinijuegoSection({ location, emptyMsg }: { location: string; emptyMsg: string }) {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const { data: bonus } = useBonusQuestions();
  const { data: myBonus } = useBonusPredictions(user?.id);
  const { data: teams } = useTeams();
  const { data: matches } = useMatches();

  const items = useMemo(() => {
    return (bonus ?? []).filter((q: any) => {
      if (q.location !== location) return false;
      if (!isAdmin && q.is_visible === false) return false;
      return true;
    });
  }, [bonus, isAdmin, location]);

  if (!user) return null;
  if (!items.length) {
    return <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">{emptyMsg}</div>;
  }

  return (
    <div className="grid gap-2.5 md:grid-cols-2">
      {items.map((b: any) => (
        <BonusCard
          key={b.id}
          bonus={b}
          mine={(myBonus ?? []).find((x: any) => x.bonus_id === b.id)?.answer}
          teams={teams ?? []}
          matches={matches ?? []}
          onSaved={() => qc.invalidateQueries({ queryKey: ["bonus_predictions", user.id] })}
        />
      ))}
    </div>
  );
}
