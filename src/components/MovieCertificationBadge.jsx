import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";
import { getMovieTmdb } from "@/lib/tmdb.functions";

// Small "PG-13" / "U/A 13+" / "18+" style badge for the top badges row.
// Shares the same "tmdb-full-details" query key as the other on-demand
// sections, so it never adds its own TMDB request.
export function MovieCertificationBadge({ tmdbId, mediaType, enabled }) {
  const fetchMovie = useServerFn(getMovieTmdb);

  const { data, isFetching } = useQuery({
    queryKey: ["tmdb-full-details", mediaType, tmdbId],
    queryFn: () => fetchMovie({ data: { tmdbId, mediaType } }),
    enabled: Boolean(enabled && tmdbId),
    staleTime: 10 * 60_000,
  });

  if (!enabled || !tmdbId || isFetching) return null;

  const certification = data?.certification;
  if (!certification?.rating) return null;

  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground">
      <ShieldCheck className="size-3" /> {certification.rating}
    </span>
  );
}
