import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MovieSearch } from "@/components/MovieSearch";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Search movies — MovieVault" },
      {
        name: "description",
        content:
          "Search any movie and instantly see whether you already watched it, then add it to your library.",
      },
      { property: "og:title", content: "Search movies — MovieVault" },
      { property: "og:description", content: "Check instantly if you already watched a movie." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  return (
    <AppShell title="Search" subtitle="Check before you watch, then add it to your vault.">
      <MovieSearch />
    </AppShell>
  );
}
