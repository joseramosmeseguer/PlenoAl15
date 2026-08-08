import { createFileRoute, redirect } from "@tanstack/react-router";

// La app siempre abre en Inicio; la Clasificación vive en /clasificacion.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/inicio" });
  },
});
