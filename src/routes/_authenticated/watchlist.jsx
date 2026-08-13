import { createFileRoute, Link } from "@tanstack/react-router";
import { Clapperboard, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MovieLibrary } from "@/components/MovieLibrary";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/watchlist")({
  head: () => ({
    meta: [
      { title: "Watchlist — MovieVault" },
      {
        name: "description",
        content: "Movies you saved for later. Mark them watched in one tap when you finish them.",
      },
      { property: "og:title", content: "Watchlist — MovieVault" },
      { property: "og:description", content: "Movies you saved to watch later on MovieVault." },
    ],
  }),
  component: WatchlistPage,
});

function WatchlistPage() {
  return (
    <AppShell title="Watchlist" subtitle="Saved for later — tap a movie to mark it watched.">
      <MovieLibrary
        status="watchlist"
        defaultSort="recently_added"
        layout="list"
        empty={
          <EmptyState
            icon={Clapperboard}
            title="Your watchlist is empty"
            description="Add movies you want to watch later."
            action={
              <Button asChild className="h-12">
                <Link to="/search">
                  <Search className="mr-2 size-4" /> Find movies
                </Link>
              </Button>
            }
          />
        }
      />
    </AppShell>
  );
}
