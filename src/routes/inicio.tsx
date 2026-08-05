import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/inicio")({
  component: Inicio,
  head: () => ({ meta: [{ title: "Inicio · Pleno al 15" }] }),
});

function Inicio() {
  return <div />;
}
