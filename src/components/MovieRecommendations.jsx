import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Star } from "lucide-react";
import { getMovieTmdb } from "@/lib/tmdb.functions";
import { MoviePoster } from "@/components/MoviePoster";
// Nesting MovieDetails here (and MovieDetails rendering this component)
// is a circular import, but it's only ever invoked at render time — never
// at module-eval time — so it resolves fine and keeps this feature
// self-contained instead of needing every screen that opens MovieDetails
// (search, browse rows, watched, watchlist) to thread through a callback.
import { MovieDetails } from "@/components/MovieDetails";

// "You might also like" row for the bottom of the detail box. Shares the
// same "tmdb-full-details" query key as the other on-demand sections, so it
// never adds its own TMDB request — recommendations ride the same
// append_to_response call. Clicking a card opens that title's own detail
// box on top of the current one.
export function MovieRecommendations({ tmdbId, mediaType, enabled }) {
  const fetchMovie = useServerFn(getMovieTmdb);
  const [selected, setSelected] = useState(null);

  const { data, isFetching } = useQuery({
    queryKey: ["tmdb-full-details", mediaType, tmdbId],
    queryFn: () => fetchMovie({ data: { tmdbId, mediaType } }),
    enabled: Boolean(enabled && tmdbId),
    staleTime: 10 * 60_000,
  });

  if (!enabled || !tmdbId || isFetching) return null;

  const recommendations = data?.recommendations ?? [];
  if (recommendations.length === 0) return null;

  return (
    <div className="mt-5 space-y-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Sparkles className="size-3.5" /> You might also like
      </p>
      <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {recommendations.map((item) => (
          <button
            key={`${item.media_type}-${item.tmdb_id}`}
            type="button"
            onClick={() => setSelected(item)}
            className="w-24 shrink-0 text-left sm:w-28"
          >
            <MoviePoster src={item.poster_url} alt={item.title} className="w-full" />
            <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug">{item.title}</p>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              {item.release_year ? <span>{item.release_year}</span> : null}
              {item.tmdb_rating ? (
                <span className="inline-flex items-center gap-0.5">
                  <Star className="size-2.5 fill-current" /> {item.tmdb_rating}
                </span>
              ) : null}
            </div>
          </button>
        ))}
      </div>

      <MovieDetails
        movie={selected}
        open={Boolean(selected)}
        onOpenChange={(next) => !next && setSelected(null)}
      />
    </div>
  );
}
