import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { UserRound, Users } from "lucide-react";
import { getMovieTmdb } from "@/lib/tmdb.functions";

// Cast & crew for the detail box. Rides the same full-details TMDB call
// MovieLanguages/SeriesSeasons already make (getMovieTmdb, which now appends
// credits+videos), sharing the "tmdb-full-details" query key so opening a
// title only ever fires one request no matter how many of these sections
// are mounted at once.
export function MovieCastCrew({ tmdbId, mediaType, enabled }) {
  const fetchMovie = useServerFn(getMovieTmdb);

  const { data, isFetching } = useQuery({
    queryKey: ["tmdb-full-details", mediaType, tmdbId],
    queryFn: () => fetchMovie({ data: { tmdbId, mediaType } }),
    enabled: Boolean(enabled && tmdbId),
    staleTime: 10 * 60_000,
  });

  if (!enabled || !tmdbId || isFetching) return null;

  const cast = data?.cast ?? [];
  const crew = data?.crew ?? [];
  if (cast.length === 0 && crew.length === 0) return null;

  const directors = crew.filter((c) => c.job === "Director");
  const writers = crew.filter((c) => c.job === "Writer");

  return (
    <div className="mt-4 space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Users className="size-3.5" /> Cast
      </p>

      {directors.length > 0 || writers.length > 0 ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {directors.length > 0 ? (
            <span>
              <span className="font-medium text-foreground">
                {directors.length === 1 ? "Director" : "Directors"}:
              </span>{" "}
              {directors.map((d) => d.name).join(", ")}
            </span>
          ) : null}
          {writers.length > 0 ? (
            <span>
              <span className="font-medium text-foreground">
                {writers.length === 1 ? "Writer" : "Writers"}:
              </span>{" "}
              {writers.map((w) => w.name).join(", ")}
            </span>
          ) : null}
        </div>
      ) : null}

      {cast.length > 0 ? (
        // Top-billed cast (TMDB's own `order`) shows first and the strip
        // scrolls horizontally to reveal the rest, matching the browse-row
        // scroll pattern used elsewhere in the app.
        <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {cast.map((person) => (
            <div key={person.id} className="flex w-20 shrink-0 flex-col items-center text-center">
              <div className="size-16 shrink-0 overflow-hidden rounded-full bg-secondary">
                {person.photo_url ? (
                  <img
                    src={person.photo_url}
                    alt={person.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground">
                    <UserRound className="size-6" />
                  </div>
                )}
              </div>
              <p className="mt-1.5 line-clamp-2 text-[11px] font-medium leading-tight">
                {person.name}
              </p>
              {person.character ? (
                <p className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">
                  {person.character}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
