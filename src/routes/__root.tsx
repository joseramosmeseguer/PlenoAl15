import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-night text-white px-4">
      <div className="text-center max-w-md">
        <div className="text-7xl mb-4">⚽</div>
        <h1 className="display text-5xl text-gold">404</h1>
        <p className="mt-2 text-white/80">Esta página se fue por la línea de fondo.</p>
        <Link
          to="/"
          className="inline-block mt-6 px-5 py-2 rounded-md bg-gold text-gold-foreground font-semibold"
        >
          Volver a la clasificación
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="display text-3xl">Algo no ha salido bien</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PlenoAl15" },
      {
        name: "description",
        content:
          "Quiniela privada de LaLiga y la Champions entre amigos: pronósticos, ranking y bonus.",
      },
      { property: "og:title", content: "PlenoAl15" },
      {
        property: "og:description",
        content:
          "Quiniela privada de LaLiga y la Champions entre amigos: pronósticos, ranking y bonus.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "PlenoAl15" },
      {
        name: "twitter:description",
        content:
          "Quiniela privada de LaLiga y la Champions entre amigos: pronósticos, ranking y bonus.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/Npr197xME4SuB9zpgnyBfZzxaCK2/social-images/social-1778498044579-f.elconfidencial.com_original_73c_eb7_54a_73ceb754a836af3d6dd36f9681ffdb39.webp",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/Npr197xME4SuB9zpgnyBfZzxaCK2/social-images/social-1778498044579-f.elconfidencial.com_original_73c_eb7_54a_73ceb754a836af3d6dd36f9681ffdb39.webp",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0f1115" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "PlenoAl15" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/icon-apple.jpg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell>
          <Outlet />
        </AppShell>
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
