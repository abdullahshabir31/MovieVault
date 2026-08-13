import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clapperboard, Film, Search, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MovieCard } from "@/components/MovieCard";
import { MovieDetails } from "@/components/MovieDetails";
import { EmptyState } from "@/components/EmptyState";
import { MovieGridSkeleton, StatsSkeleton } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { computeStats, useMovies } from "@/hooks/useMovies";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MovieVault" },
      {
        name: "description",
        content:
          "Your movie stats at a glance: total movies, watched, watchlist and average rating.",
      },
      { property: "og:title", content: "Dashboard — MovieVault" },
      {
        property: "og:description",
        content: "Your movie stats, recently added and recently watched.",
      },
    ],
  }),
  component: Dashboard,
});

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </span>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function Section({ title, movies, onOpen, emptyText }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {movies.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface/60 p-5 text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} onOpen={onOpen} />
          ))}
        </div>
      )}
    </section>
  );
}

function Dashboard() {
  const { data: movies, isLoading } = useMovies();
  const [selected, setSelected] = useState(null);
  const stats = computeStats(movies);

  const recentlyAdded = (movies ?? []).slice(0, 5);
  const recentlyWatched = (movies ?? [])
    .filter((m) => m.status === "watched")
    .sort((a, b) =>
      String(b.watched_date ?? b.updated_at).localeCompare(String(a.watched_date ?? a.updated_at)),
    )
    .slice(0, 5);

  return (
    <AppShell
      title="Your vault"
      subtitle="Everything you've watched and everything that's next."
      action={
        <Button asChild size="sm" className="h-11">
          <Link to="/search">
            <Search className="mr-2 size-4" /> Add movie
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <>
          <StatsSkeleton />
          <div className="mt-8">
            <MovieGridSkeleton count={5} />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={Film} label="Total movies" value={stats.total} />
            <StatCard icon={CheckCircle2} label="Watched" value={stats.watched} />
            <StatCard icon={Clapperboard} label="Watchlist" value={stats.watchlist} />
            <StatCard
              icon={Star}
              label="Avg rating"
              value={stats.average ? `${stats.average}/10` : "—"}
            />
          </div>

          {stats.total === 0 ? (
            <div className="mt-8">
              <EmptyState
                icon={Film}
                title="Your vault is empty"
                description="Search for a movie and add it to your watched list or watchlist."
                action={
                  <Button asChild className="h-12">
                    <Link to="/search">
                      <Search className="mr-2 size-4" /> Search movies
                    </Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <Section
                title="Recently added"
                movies={recentlyAdded}
                onOpen={setSelected}
                emptyText="Nothing added yet."
              />
              <Section
                title="Recently watched"
                movies={recentlyWatched}
                onOpen={setSelected}
                emptyText="You haven't marked any movie as watched yet."
              />
            </>
          )}
        </>
      )}

      <MovieDetails
        movie={selected}
        open={Boolean(selected)}
        onOpenChange={() => setSelected(null)}
      />

      <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        © 2026 Abdullah. All rights reserved.
      </footer>
    </AppShell>
  );
}
