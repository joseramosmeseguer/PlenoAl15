import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Users, BarChart3, UserCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useBonusQuestions, useAllBonusPredictions, useTeams, useMatches } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { isMinijuegoLocation } from "@/lib/bonus-locations";
import { MatchStatsList } from "@/components/stats/MatchStatsList";
import { BonusStatsSection } from "@/components/stats/BonusStatsSection";
import { RealStatsTab } from "@/components/stats/RealStatsTab";
import { MyStatsTab } from "@/components/stats/MyStatsTab";

export const Route = createFileRoute("/estadisticas")({
  component: Stats,
  head: () => ({ meta: [{ title: "Estadísticas · El Mundial" }] }),
});

const ESPECIALES_SECTIONS = [
  { key: "mis_especiales_generales", label: "Generales" },
  { key: "mis_especiales_tops", label: "Tops del torneo" },
  { key: "mis_especiales_grupos", label: "Fase de grupos" },
  { key: "mis_especiales_eliminatorias", label: "Eliminatorias" },
];

function Stats() {
  const { isAdmin } = useAuth();
  const { data: bonusQuestions } = useBonusQuestions();
  const { data: bonusPreds } = useAllBonusPredictions();
  const { data: teams } = useTeams();
  const { data: matches } = useMatches();
  const [especialesTab, setEspecialesTab] = useState(ESPECIALES_SECTIONS[0].key);

  const predsByQuestion = useMemo(() => {
    const map: Record<string, any[]> = {};
    (bonusPreds ?? []).forEach((p: any) => (map[p.bonus_id] ||= []).push(p));
    return map;
  }, [bonusPreds]);

  const questionsByLocation = useMemo(() => {
    const map: Record<string, any[]> = {};
    (bonusQuestions ?? []).forEach((q: any) => {
      if (isMinijuegoLocation(q.location)) return;
      if (!isAdmin && q.is_visible === false) return;
      const k = q.location ?? "mis_especiales_generales";
      (map[k] ||= []).push(q);
    });
    return map;
  }, [bonusQuestions, isAdmin]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-pitch text-primary-foreground p-5 shadow-soft">
        <div className="display text-3xl flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Estadísticas</div>
        <p className="text-white/80 text-sm">Cómo pronostica la comunidad y los datos reales del Mundial.</p>
      </div>

      <Tabs defaultValue="comunidad" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 gap-1">
          <TabsTrigger value="comunidad" className="flex items-center gap-1.5 py-2.5 text-sm font-semibold data-[state=active]:shadow-md">
            <Users className="h-4 w-4" /> Comunidad
          </TabsTrigger>
          <TabsTrigger value="mias" className="flex items-center gap-1.5 py-2.5 text-sm font-semibold data-[state=active]:shadow-md">
            <UserCircle className="h-4 w-4" /> Mis estadísticas
          </TabsTrigger>
          <TabsTrigger value="reales" className="flex items-center gap-1.5 py-2.5 text-sm font-semibold data-[state=active]:shadow-md">
            <BarChart3 className="h-4 w-4" /> Estadísticas reales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comunidad" className="mt-4">
          <Tabs defaultValue="partidos" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 h-auto p-1 gap-1">
              <TabsTrigger value="partidos" className="py-2 text-sm font-semibold data-[state=active]:shadow-md">
                ⚽ Partidos
              </TabsTrigger>
              <TabsTrigger value="especiales" className="py-2 text-sm font-semibold data-[state=active]:shadow-md">
                ⭐ Especiales
              </TabsTrigger>
            </TabsList>

            <TabsContent value="partidos" className="mt-3">
              <MatchStatsList />
            </TabsContent>

            <TabsContent value="especiales" className="space-y-3 mt-3">
              <div className="flex gap-2 flex-wrap">
                {ESPECIALES_SECTIONS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setEspecialesTab(s.key)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      especialesTab === s.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <BonusStatsSection
                questions={questionsByLocation[especialesTab] ?? []}
                predsByQuestion={predsByQuestion}
                teams={teams ?? []}
                matches={matches ?? []}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="mias" className="mt-4">
          <MyStatsTab />
        </TabsContent>

        <TabsContent value="reales" className="mt-4">
          <RealStatsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
