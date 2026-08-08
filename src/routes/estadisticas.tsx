import { createFileRoute } from "@tanstack/react-router";
import { Users, BarChart3, UserCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SectionHero } from "@/components/SectionHero";
import { LaLigaMatchStats } from "@/components/stats/LaLigaMatchStats";
import { MyLaLigaStats } from "@/components/stats/MyLaLigaStats";

export const Route = createFileRoute("/estadisticas")({
  component: Stats,
  head: () => ({ meta: [{ title: "Estadísticas · PlenoAl15" }] }),
});

function Stats() {
  return (
    <div className="space-y-5">
      <SectionHero title="ESTADÍSTICAS" eyebrow="Datos y tendencias" subtitle="Cómo pronostica la comunidad." icon={BarChart3} />

      <Tabs defaultValue="comunidad" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-auto p-1 gap-1">
          <TabsTrigger value="comunidad" className="flex items-center gap-1.5 py-2.5 text-sm font-semibold data-[state=active]:shadow-md">
            <Users className="h-4 w-4" /> Comunidad
          </TabsTrigger>
          <TabsTrigger value="mias" className="flex items-center gap-1.5 py-2.5 text-sm font-semibold data-[state=active]:shadow-md">
            <UserCircle className="h-4 w-4" /> Mis estadísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comunidad" className="mt-4">
          <LaLigaMatchStats />
        </TabsContent>

        <TabsContent value="mias" className="mt-4">
          <MyLaLigaStats />
        </TabsContent>
      </Tabs>
    </div>
  );
}
