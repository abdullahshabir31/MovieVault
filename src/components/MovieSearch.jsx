import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Film, Loader2, Search, Star, X } from "lucide-react";
import { searchMoviesTmdb, getBrowseRowsTmdb, ALL_GENRES } from "@/lib/tmdb.functions";
import { useMovies } from "@/hooks/useMovies";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MoviePoster } from "@/components/MoviePoster";
import { MovieDetails } from "@/components/MovieDetails";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/LoadingState";
import { MovieRow, MovieRowSkeleton } from "@/components/MovieRow";
import { MovieGrid } from "@/components/MovieGrid";
import { cn } from "@/lib/utils";

function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// Classic edit-distance so misspelled suggestions ("recher") can still be
// matched and ranked against the correct title ("Reacher").
function levenshtein(a, b) {
  const s = (a || "").toLowerCase();
  const t = (b || "").toLowerCase();
  const dp = Array.from({ length: s.length + 1 }, (_, i) => [i, ...new Array(t.length).fill(0)]);
  for (let j = 0; j <= t.length; j++) dp[0][j] = j;
  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      dp[i][j] =
        s[i - 1] === t[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[s.length][t.length];
}

export function MovieSearch({ initialQuery = "" }) {
  const [term, setTerm] = useState(initialQuery);
  const debounced = useDebounced(term.trim());
  // The results list below only reacts to this — it's set explicitly on
  // Enter or when a suggestion is picked, not on every keystroke, so the
  // list stays put while the person is still typing/browsing the dropdown.
  const [submittedTerm, setSubmittedTerm] = useState(initialQuery.trim());
  const [mediaFilter, setMediaFilter] = useState("movie");
  const [category, setCategory] = useState("all");
  const search = useServerFn(searchMoviesTmdb);
  const browseRows = useServerFn(getBrowseRowsTmdb);
  const { data: library } = useMovies();
  // Whatever movie/series was clicked — from a browse row, a search result,
  // or a suggestion — opens the same rich details box (with its language
  // info, cast-free overview, and watched/watchlist actions inside it).
  const [detailsMovie, setDetailsMovie] = useState(null);

  // A genre chip that has no TV equivalent (e.g. Horror) can't stay selected
  // when switching to the Series view, so drop back to "All" whenever the
  // Movies/Series toggle changes.
  useEffect(() => {
    setCategory("all");
  }, [mediaFilter]);

  const visibleGenres = useMemo(
    () => (mediaFilter === "tv" ? ALL_GENRES.filter((g) => g.tvGenreId) : ALL_GENRES),
    [mediaFilter],
  );

  const libraryByTmdb = useMemo(() => {
    const map = new Map();
    (library ?? []).forEach((m) => map.set(`${m.media_type ?? "movie"}:${Number(m.tmdb_id)}`, m));
    return map;
  }, [library]);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["tmdb-search", submittedTerm],
    queryFn: () => search({ data: { query: submittedTerm } }),
    enabled: submittedTerm.length > 1,
    staleTime: 60_000,
  });

  const results = data?.results ?? [];
  const isBrowsing = submittedTerm.length <= 1;

  // Lightweight autocomplete dropdown, shown right under the search bar as
  // the person types (like a Google-style suggestion list), with poster
  // thumbnails. If the exact spelling gets no hits, we retry with the query
  // trimmed a character at a time — this recovers titles even when the typo
  // is deep in the word (e.g. "recher" for "Reacher") — then rank whatever
  // comes back by how close each title's spelling is to what was typed, so
  // the best match always sits at the top.
  const [suggestOpen, setSuggestOpen] = useState(false);
  const { data: suggestions, isFetching: suggestFetching } = useQuery({
    queryKey: ["tmdb-suggest", debounced],
    queryFn: async () => {
      let query = debounced;
      let json = await search({ data: { query } });
      let attempts = 0;
      while ((!json.results || json.results.length === 0) && query.length > 3 && attempts < 4) {
        query = query.slice(0, -1);
        json = await search({ data: { query } });
        attempts++;
      }
      return (json.results ?? [])
        .map((movie) => ({ ...movie, _dist: levenshtein(movie.title, debounced) }))
        .sort((a, b) => a._dist - b._dist)
        .slice(0, 6);
    },
    enabled: debounced.length > 1 && suggestOpen,
    staleTime: 30_000,
  });

  const {
    data: rowsData,
    fetchNextPage: fetchNextRowsPage,
    hasNextPage: hasMoreRowsPage,
    isFetchingNextPage: isFetchingMoreRows,
    isFetching: rowsFetching,
    isError: rowsError,
  } = useInfiniteQuery({
    queryKey: ["tmdb-browse-rows", mediaFilter],
    queryFn: ({ pageParam }) => browseRows({ data: { mediaType: mediaFilter, offset: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasMoreRows ? lastPage.nextOffset : undefined),
    enabled: isBrowsing,
    staleTime: 10 * 60_000,
  });

  const rows = useMemo(() => (rowsData?.pages ?? []).flatMap((p) => p.rows), [rowsData]);
  const activeRow = rows.find((row) => row.key === category);
  const activeGenre = ALL_GENRES.find((g) => g.key === category);
  const activeCategoryTitle = activeRow?.title ?? activeGenre?.title ?? "";

  const rowsSentinelRef = useRef(null);
  useEffect(() => {
    const sentinel = rowsSentinelRef.current;
    if (!sentinel || category !== "all" || !hasMoreRowsPage) return;

    // rootMargin 0 on purpose: the sentinel should only trigger once it is
    // actually on screen at the bottom of the scroll. A positive margin
    // here fires early, and since a freshly-appended batch keeps the
    // sentinel within that margin as soon as it renders, it kept re-firing
    // on its own without the person scrolling any further.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingMoreRows) {
          fetchNextRowsPage();
        }
      },
      { rootMargin: "0px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [category, hasMoreRowsPage, isFetchingMoreRows, fetchNextRowsPage]);

  const badgeForMovie = (movie) => {
    const existing = libraryByTmdb.get(`${movie.media_type ?? "movie"}:${Number(movie.tmdb_id)}`);
    if (!existing) return null;
    return existing.status === "watched" ? "Watched" : "In Watchlist";
  };

  const handleSelectSuggestion = (movie) => {
    setTerm(movie.title);
    setSubmittedTerm(movie.title.trim());
    setSuggestOpen(false);
  };

  // Clicking any movie/series tile — browse row, grid, or search result —
  // opens the same details box; it looks itself up against the library, so
  // no need to pre-merge the "already saved" fields here.
  const handleRowSelect = (movie) => setDetailsMovie(movie);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(event) => {
            const value = event.target.value;
            setTerm(value);
            setSuggestOpen(true);
            // Clearing the box by hand should drop straight back to
            // browsing — nothing "in progress" to preserve there.
            if (!value.trim()) setSubmittedTerm("");
          }}
          onFocus={() => setSuggestOpen(true)}
          onBlur={() => setSuggestOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setSuggestOpen(false);
            // Enter commits the typed query: this is what actually updates
            // the results list below, dismisses the suggestion dropdown, and
            // drops the keyboard on mobile.
            if (event.key === "Enter") {
              event.preventDefault();
              setSubmittedTerm(term.trim());
              setSuggestOpen(false);
              event.currentTarget.blur();
            }
          }}
          placeholder="Search any movie or TV show"
          autoComplete="off"
          enterKeyHint="search"
          className="h-14 rounded-2xl pl-12 pr-11 text-base"
          aria-label="Search movies and TV shows"
          role="combobox"
          aria-expanded={suggestOpen && term.trim().length > 1}
          aria-autocomplete="list"
        />
        {term ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setTerm("");
              setSubmittedTerm("");
              setSuggestOpen(false);
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        ) : null}

        {suggestOpen && term.trim().length > 1 ? (
          <div
            role="listbox"
            className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-96 overflow-y-auto rounded-2xl border border-border bg-popover shadow-glow"
          >
            {suggestFetching && !suggestions ? (
              <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Searching…
              </div>
            ) : suggestions && suggestions.length > 0 ? (
              <ul className="divide-y divide-border">
                {suggestions.map((movie) => (
                  <li key={`suggest-${movie.media_type}-${movie.tmdb_id}`}>
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleSelectSuggestion(movie);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-secondary"
                    >
                      <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-secondary">
                        {movie.poster_url ? (
                          <img
                            src={movie.poster_url}
                            alt=""
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="grid size-full place-items-center text-muted-foreground">
                            <Film className="size-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium">{movie.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {[movie.media_type === "tv" ? "TV Series" : "Movie", movie.release_year]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : !suggestFetching ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">
                Nothing matched “{term.trim()}”.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {isBrowsing ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMediaFilter("movie")}
            aria-pressed={mediaFilter === "movie"}
            className={cn(
              "rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
              mediaFilter === "movie"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            Movies
          </button>
          <button
            type="button"
            onClick={() => setMediaFilter("tv")}
            aria-pressed={mediaFilter === "tv"}
            className={cn(
              "rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
              mediaFilter === "tv"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            TV Series
          </button>
        </div>
      ) : null}

      {isBrowsing ? (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {[{ key: "all", title: "All" }, ...visibleGenres].map((chip) => (
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

      {isFetching && submittedTerm.length > 1 ? <ListSkeleton /> : null}

      {isError ? (
        <EmptyState
          icon={Search}
          title="Search unavailable"
          description={error?.message || "We couldn't reach the movie database. Please try again."}
        />
      ) : null}

      {!isFetching && !isError && submittedTerm.length > 1 && results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nothing found"
          description={`Nothing matched “${submittedTerm}”.`}
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
                mediaType={mediaFilter}
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
                mediaType={mediaFilter}
              />
            </div>
          )}

          {category === "all" && hasMoreRowsPage ? (
            <div ref={rowsSentinelRef} className="space-y-6 pb-2">
              {isFetchingMoreRows ? (
                <>
                  <MovieRowSkeleton />
                  <MovieRowSkeleton />
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {!isFetching && results.length > 0 ? (
        <ul className="space-y-3">
          {results.map((movie) => {
            const badge = badgeForMovie(movie);
            return (
              <li key={`${movie.media_type}-${movie.tmdb_id}`}>
                <button
                  type="button"
                  onClick={() => setDetailsMovie(movie)}
                  className="flex w-full gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-card transition-colors hover:bg-secondary/40"
                >
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
                    <Badge variant={badge ? "secondary" : "outline"} className="mt-2 text-[11px]">
                      {badge ?? "Not watched yet"}
                    </Badge>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <MovieDetails
        movie={detailsMovie}
        open={Boolean(detailsMovie)}
        onOpenChange={() => setDetailsMovie(null)}
      />
    </div>
  );
}
