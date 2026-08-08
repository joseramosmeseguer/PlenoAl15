import { createFileRoute } from "@tanstack/react-router";
import { RulesContent } from "@/components/RulesContent";

export const Route = createFileRoute("/reglas")({
  component: Rules,
  head: () => ({ meta: [{ title: "Reglas · PlenoAl15" }] }),
});

function Rules() {
  return <RulesContent />;
}
