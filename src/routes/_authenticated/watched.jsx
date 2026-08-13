import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MovieLibrary } from "@/components/MovieLibrary";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/watched")({
  head: () => ({
    meta: [
      { title: "Watched movies — MovieVault" },
      {
        name: "description",
        content: "Every movie you've watched, with your personal ratings, notes and watch dates.",
      },
      { property: "og:title", content: "Watched movies — MovieVault" },
      {
        property: "og:description",
        content: "Browse, filter and sort every movie you've watched.",
      },
    ],
  }),
  component: WatchedPage,
});

function WatchedPage() {
  return (
    <AppShell title="Watched" subtitle="Everything you've already seen.">
      <MovieLibrary
        status="watched"
        defaultSort="recently_watched"
        empty={
          <EmptyState
            icon={CheckCircle2}
            title="No watched movies yet"
            description="Search for a movie and add it to your watched list."
            action={
              <Button asChild className="h-12">
                <Link to="/search">
                  <Search className="mr-2 size-4" /> Search movies
                </Link>
              </Button>
            }
          />
        }
      />
    </AppShell>
  );
}
