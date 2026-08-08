import { createFileRoute } from "@tanstack/react-router";
import { Users, BarChart3, UserCircle, Trophy, Award } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SectionHero } from "@/components/SectionHero";
import { LaLigaMatchStats } from "@/components/stats/LaLigaMatchStats";
import { LaLigaBadges } from "@/components/stats/LaLigaBadges";
import { MyLaLigaStats } from "@/components/stats/MyLaLigaStats";
import { RealStatsTab } from "@/components/stats/RealStatsTab";

export const Route = createFileRoute("/estadisticas")({
  component: Stats,
  head: () => ({ meta: [{ title: "Estadísticas · PlenoAl15" }] }),
});

function Stats() {
  return (
    <div className="space-y-5">
      <SectionHero title="ESTADÍSTICAS" eyebrow="Datos y tendencias" subtitle="Cómo pronostica la comunidad y datos reales de LaLiga." icon={BarChart3} />

      <Tabs defaultValue="comunidad" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 gap-1">
          <TabsTrigger value="comunidad" className="flex items-center gap-1.5 py-2.5 text-sm font-semibold data-[state=active]:shadow-md">
            <Users className="h-4 w-4" /> Comunidad
          </TabsTrigger>
          <TabsTrigger value="mias" className="flex items-center gap-1.5 py-2.5 text-sm font-semibold data-[state=active]:shadow-md">
            <UserCircle className="h-4 w-4" /> Mis estadísticas
          </TabsTrigger>
          <TabsTrigger value="reales" className="flex items-center gap-1.5 py-2.5 text-sm font-semibold data-[state=active]:shadow-md">
            <BarChart3 className="h-4 w-4" /> Stats reales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comunidad" className="mt-4">
          <Tabs defaultValue="partidos" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 h-auto p-1 gap-1">
              <TabsTrigger value="partidos" className="flex items-center gap-1.5 py-2 text-sm font-semibold data-[state=active]:shadow-md">
                <Trophy className="h-3.5 w-3.5" /> Partidos
              </TabsTrigger>
              <TabsTrigger value="insignias" className="flex items-center gap-1.5 py-2 text-sm font-semibold data-[state=active]:shadow-md">
                <Award className="h-3.5 w-3.5" /> Insignias
              </TabsTrigger>
            </TabsList>

            <TabsContent value="partidos" className="mt-3">
              <LaLigaMatchStats />
            </TabsContent>

            <TabsContent value="insignias" className="mt-3">
              <LaLigaBadges />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="mias" className="mt-4">
          <MyLaLigaStats />
        </TabsContent>

        <TabsContent value="reales" className="mt-4">
          <RealStatsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
