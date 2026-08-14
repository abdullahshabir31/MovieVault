import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ListPlus, Loader2, Search, Star, X } from "lucide-react";
import { searchMoviesTmdb, getBrowseRowsTmdb, ALL_GENRES } from "@/lib/tmdb.functions";
import { useAddMovie, useMovies, useUpdateMovie } from "@/hooks/useMovies";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoviePoster } from "@/components/MoviePoster";
import { MovieFormDialog } from "@/components/MovieFormDialog";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/LoadingState";
import { MovieRow, MovieRowSkeleton } from "@/components/MovieRow";
import { MovieGrid } from "@/components/MovieGrid";
import { formatDate } from "@/components/MovieCard";
import { cn } from "@/lib/utils";

function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function MovieSearch({ initialQuery = "" }) {
  const [term, setTerm] = useState(initialQuery);
  const debounced = useDebounced(term.trim());
  const [category, setCategory] = useState("all");
  const search = useServerFn(searchMoviesTmdb);
  const browseRows = useServerFn(getBrowseRowsTmdb);
  const { data: library } = useMovies();
  const [selected, setSelected] = useState(null);
  const [formStatus, setFormStatus] = useState("watchlist");
  const [formOpen, setFormOpen] = useState(false);
  const addMovie = useAddMovie();
  const updateMovie = useUpdateMovie();

  const libraryByTmdb = useMemo(() => {
    const map = new Map();
    (library ?? []).forEach((m) => map.set(`${m.media_type ?? "movie"}:${Number(m.tmdb_id)}`, m));
    return map;
  }, [library]);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["tmdb-search", debounced],
    queryFn: () => search({ data: { query: debounced } }),
    enabled: debounced.length > 1,
    staleTime: 60_000,
  });

  const results = data?.results ?? [];
  const isBrowsing = debounced.length <= 1;

  const {
    data: rowsData,
    isFetching: rowsFetching,
    isError: rowsError,
  } = useQuery({
    queryKey: ["tmdb-browse-rows"],
    queryFn: () => browseRows(),
    enabled: isBrowsing,
    staleTime: 10 * 60_000,
  });

  const rows = rowsData?.rows ?? [];
  const activeRow = rows.find((row) => row.key === category);
  const activeGenre = ALL_GENRES.find((g) => g.key === category);
  const activeCategoryTitle = activeRow?.title ?? activeGenre?.title ?? "";

  const badgeForMovie = (movie) => {
    const existing = libraryByTmdb.get(`${movie.media_type ?? "movie"}:${Number(movie.tmdb_id)}`);
    if (!existing) return null;
    return existing.status === "watched" ? "Watched" : "In Watchlist";
  };

  const openForm = (movie, status) => {
    setSelected(movie);
    setFormStatus(status);
    setFormOpen(true);
  };

  const handleRowSelect = (movie) => {
    const existing = libraryByTmdb.get(`${movie.media_type ?? "movie"}:${Number(movie.tmdb_id)}`);
    if (existing) {
      openForm({ ...movie, ...existing }, "watched");
    } else {
      openForm(movie, "watchlist");
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search any movie or TV show"
          autoComplete="off"
          enterKeyHint="search"
          className="h-14 rounded-2xl pl-12 pr-11 text-base"
          aria-label="Search movies and TV shows"
        />
        {term ? (
          <button
            type="button"
            onClick={() => setTerm("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {isBrowsing ? (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {[{ key: "all", title: "All" }, ...ALL_GENRES].map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setCategory(chip.key)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                category === chip.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {chip.title}
            </button>
          ))}
        </div>
      ) : null}

      {isFetching && debounced.length > 1 ? <ListSkeleton /> : null}

      {isError ? (
        <EmptyState
          icon={Search}
          title="Search unavailable"
          description={error?.message || "We couldn't reach the movie database. Please try again."}
        />
      ) : null}

      {!isFetching && !isError && debounced.length > 1 && results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nothing found"
          description={`Nothing matched “${debounced}”.`}
        />
      ) : null}

      {isBrowsing ? (
        <div className="space-y-6">
          {category === "all" && rowsFetching && rows.length === 0 ? (
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <MovieRowSkeleton key={i} />
              ))}
            </div>
          ) : null}

          {category === "all" && rowsError && rows.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Couldn't load suggestions"
              description="Type a movie title above to search instead."
            />
          ) : null}

          {category === "all" ? (
            rows.map((row) => (
              <MovieRow
                key={row.key}
                rowKey={row.key}
                title={row.title}
                initialMovies={row.movies}
                initialHasMore={row.hasMore}
                onSelect={handleRowSelect}
                badgeFor={badgeForMovie}
              />
            ))
          ) : (
            <div>
              <h2 className="mb-3 px-0.5 text-base font-bold tracking-tight">
                {activeCategoryTitle}
              </h2>
              <MovieGrid
                rowKey={category}
                initialMovies={activeRow?.movies}
                initialHasMore={activeRow?.hasMore}
                onSelect={handleRowSelect}
                badgeFor={badgeForMovie}
              />
            </div>
          )}
        </div>
      ) : null}

      {!isFetching && results.length > 0 ? (
        <ul className="space-y-3">
          {results.map((movie) => {
            const existing = libraryByTmdb.get(`${movie.media_type ?? "movie"}:${Number(movie.tmdb_id)}`);
            return (
              <li
                key={`${movie.media_type}-${movie.tmdb_id}`}
                className="rounded-2xl border border-border bg-card p-3 shadow-card"
              >
                <div className="flex gap-3">
                  <MoviePoster
                    src={movie.poster_url}
                    alt={movie.title}
                    className="h-28 w-19 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-sm font-semibold">{movie.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-medium">
                        {movie.media_type === "tv" ? "TV Series" : "Movie"}
                      </Badge>
                      {movie.release_year ? <span>{movie.release_year}</span> : null}
                      {movie.media_type === "tv" && movie.number_of_seasons ? (
                        <span>
                          {movie.number_of_seasons}{" "}
                          {movie.number_of_seasons === 1 ? "season" : "seasons"}
                        </span>
                      ) : null}
                      {movie.tmdb_rating ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="size-3" /> {movie.tmdb_rating}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {movie.overview}
                    </p>
                  </div>
                </div>

                {existing ? (
                  <div className="mt-3 space-y-2 rounded-xl bg-surface p-3">
                    {existing.status === "watched" ? (
                      <>
                        <p className="flex items-center gap-2 text-sm font-bold text-success">
                          <CheckCircle2 className="size-4" /> ALREADY WATCHED
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {existing.watched_date
                            ? `You watched this on ${formatDate(existing.watched_date)}.`
                            : "This is already in your watched list."}
                          {existing.personal_rating
                            ? ` You rated it ${existing.personal_rating}/10.`
                            : ""}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="flex items-center gap-2 text-sm font-bold text-primary">
                          📋 This is on your watchlist.
                        </p>
                        <Button
                          size="sm"
                          className="h-11 w-full"
                          onClick={() => openForm({ ...movie, ...existing }, "watched")}
                        >
                          <CheckCircle2 className="mr-2 size-4" /> Mark as watched
                        </Button>
                      </>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      This is already in your library.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <Badge variant="secondary" className="text-[11px]">
                      Not watched yet
                    </Badge>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        className="h-11"
                        onClick={() => openForm(movie, "watchlist")}
                      >
                        <ListPlus className="mr-2 size-4" /> Watchlist
                      </Button>
                      <Button className="h-11" onClick={() => openForm(movie, "watched")}>
                        <CheckCircle2 className="mr-2 size-4" /> Watched
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      <MovieFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        movie={selected}
        initialStatus={formStatus}
        title={selected?.id ? "Mark as watched" : "Add to your library"}
        submitLabel={selected?.id ? "Save" : "Add movie"}
        lockStatus={Boolean(selected?.id)}
        pending={addMovie.isPending || updateMovie.isPending}
        onSubmit={(values) => {
          if (selected?.id) {
            updateMovie.mutate(
              {
                id: selected.id,
                updates: { ...values, status: "watched" },
                successMessage: `Marked "${selected.title}" as watched`,
              },
              { onSuccess: () => setFormOpen(false) },
            );
            return;
          }
          addMovie.mutate({ ...selected, ...values }, { onSuccess: () => setFormOpen(false) });
        }}
      />

      {addMovie.isPending ? (
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Saving…
        </p>
      ) : null}
    </div>
  );
}
