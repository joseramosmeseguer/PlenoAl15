import { createFileRoute } from "@tanstack/react-router";
import { RulesContent } from "@/components/RulesContent";
// test sync

export const Route = createFileRoute("/reglas")({
  component: Rules,
  head: () => ({ meta: [{ title: "Reglas · El Mundial" }] }),
});

function Rules() {
  return <RulesContent />;
}
