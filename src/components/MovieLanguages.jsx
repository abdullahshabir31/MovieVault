import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Languages } from "lucide-react";
import { getMovieTmdb } from "@/lib/tmdb.functions";
import { Badge } from "@/components/ui/badge";

// Shows the original language plus every language TMDB has audio/subtitle
// data for (spoken_languages) — the closest thing TMDB's API exposes to an
// "available dubs" list. Only the full /movie/{id} or /tv/{id} details
// endpoint carries spoken_languages, so this fetches on demand once the
// details box is opened, same as SeriesSeasons does for episode data. Shares
// its query key with SeriesSeasons for TV so the two don't double-fetch.
export function MovieLanguages({ tmdbId, mediaType, enabled }) {
  const fetchMovie = useServerFn(getMovieTmdb);

  const { data, isFetching } = useQuery({
    queryKey: ["tmdb-full-details", mediaType, tmdbId],
    queryFn: () => fetchMovie({ data: { tmdbId, mediaType } }),
    enabled: Boolean(enabled && tmdbId),
    staleTime: 10 * 60_000,
  });

  if (!enabled || !tmdbId || isFetching) return null;

  const original = data?.original_language;
  const spoken = (data?.spoken_languages ?? []).filter((name) => name !== original);
  if (!original && spoken.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Languages className="size-3.5" /> Languages
      </p>
      <div className="flex flex-wrap gap-1.5">
        {original ? <Badge variant="secondary">{original} (original)</Badge> : null}
        {spoken.map((name) => (
          <Badge key={name} variant="outline">
            {name}
          </Badge>
        ))}
      </div>
    </div>
  );
}
