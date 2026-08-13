import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MovieCard, MovieRow } from "@/components/MovieCard";
import { MovieDetails } from "@/components/MovieDetails";
import { MovieGridSkeleton } from "@/components/LoadingState";
import { allGenres, allYears, useMovies } from "@/hooks/useMovies";

const SORTS = {
  recently_watched: { label: "Recently watched" },
  recently_added: { label: "Recently added" },
  highest_rated: { label: "Highest rated" },
  newest: { label: "Newest release" },
  oldest: { label: "Oldest release" },
};

function sortMovies(list, sort) {
  const copy = [...list];
  switch (sort) {
    case "recently_watched":
      return copy.sort((a, b) =>
        String(b.watched_date ?? b.updated_at).localeCompare(
          String(a.watched_date ?? a.updated_at),
        ),
      );
    case "highest_rated":
      return copy.sort((a, b) => (b.personal_rating ?? -1) - (a.personal_rating ?? -1));
    case "newest":
      return copy.sort((a, b) => (b.release_year ?? 0) - (a.release_year ?? 0));
    case "oldest":
      return copy.sort((a, b) => (a.release_year ?? 9999) - (b.release_year ?? 9999));
    default:
      return copy.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }
}

export function MovieLibrary({ status, defaultSort = "recently_added", layout = "grid", empty }) {
  const { data: movies, isLoading } = useMovies();
  const [term, setTerm] = useState("");
  const [genre, setGenre] = useState("all");
  const [year, setYear] = useState("all");
  const [rating, setRating] = useState("all");
  const [sort, setSort] = useState(defaultSort);
  const [selected, setSelected] = useState(null);

  const scoped = useMemo(() => (movies ?? []).filter((m) => m.status === status), [movies, status]);
  const genres = allGenres(scoped);
  const years = allYears(scoped);

  const filtered = useMemo(() => {
    const query = term.trim().toLowerCase();
    const list = scoped.filter((movie) => {
      if (query && !movie.title.toLowerCase().includes(query)) return false;
      if (genre !== "all" && !(movie.genres ?? []).includes(genre)) return false;
      if (year !== "all" && String(movie.release_year) !== year) return false;
      if (rating !== "all" && (movie.personal_rating ?? 0) < Number(rating)) return false;
      return true;
    });
    return sortMovies(list, sort);
  }, [scoped, term, genre, year, rating, sort]);

  const showFilters = scoped.length > 0;
  const selectedLive = selected ? ((movies ?? []).find((m) => m.id === selected.id) ?? null) : null;

  return (
    <div className="space-y-4">
      {showFilters ? (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search your library"
              className="h-12 rounded-2xl pl-11"
              aria-label="Search your library"
            />
          </div>

          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-10 w-auto shrink-0 gap-2 rounded-full">
                <SlidersHorizontal className="size-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SORTS).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="h-10 w-auto shrink-0 rounded-full">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All genres</SelectItem>
                {genres.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-10 w-auto shrink-0 rounded-full">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger className="h-10 w-auto shrink-0 rounded-full">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any rating</SelectItem>
                {[9, 8, 7, 6, 5].map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r}+ / 10
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : null}

      {isLoading ? (
        <MovieGridSkeleton />
      ) : scoped.length === 0 ? (
        empty
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface/60 p-6 text-center text-sm text-muted-foreground">
          No movies found. Try a different search or filter.
        </p>
      ) : layout === "list" ? (
        <ul className="space-y-3">
          {filtered.map((movie) => (
            <li key={movie.id}>
              <MovieRow movie={movie} onOpen={setSelected} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((movie) => (
            <MovieCard key={movie.id} movie={movie} onOpen={setSelected} />
          ))}
        </div>
      )}

      <MovieDetails
        movie={selectedLive}
        open={Boolean(selectedLive)}
        onOpenChange={() => setSelected(null)}
      />
    </div>
  );
}
