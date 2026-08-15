import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clapperboard, PlayCircle } from "lucide-react";
import { getMovieTmdb } from "@/lib/tmdb.functions";

function VideoCard({ video }) {
  const youtubeUrl = `https://www.youtube.com/watch?v=${video.key}`;
  // hqdefault is guaranteed to exist for every YouTube video (unlike
  // maxresdefault), so this needs no extra API call and never 404s.
  const thumbnailUrl = `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`;

  return (
    <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="group w-32 shrink-0">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-secondary">
        <img
          src={thumbnailUrl}
          alt={video.name || video.type}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
          <PlayCircle className="size-7 text-white drop-shadow-lg" />
        </div>
      </div>
      <p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground">
        {video.type === "Teaser" ? "Teaser" : "Trailer"}
        {video.name ? ` · ${video.name}` : ""}
      </p>
    </a>
  );
}

// Trailers/teasers for the detail box — every YouTube trailer/teaser TMDB
// has, shown as a horizontal scrolling row of small thumbnails (official
// trailers first) instead of one large embed, so the box itself stays a
// normal size and only the row scrolls. Shares the same "tmdb-full-details"
// query key as the other on-demand sections, so it never adds its own TMDB
// request.
export function MovieTrailer({ tmdbId, mediaType, enabled }) {
  const fetchMovie = useServerFn(getMovieTmdb);

  const { data, isFetching } = useQuery({
    queryKey: ["tmdb-full-details", mediaType, tmdbId],
    queryFn: () => fetchMovie({ data: { tmdbId, mediaType } }),
    enabled: Boolean(enabled && tmdbId),
    staleTime: 10 * 60_000,
  });

  if (!enabled || !tmdbId || isFetching) return null;

  const videos = data?.videos ?? [];
  if (videos.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Clapperboard className="size-3.5" /> Trailers
      </p>
      <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {videos.map((video) => (
          <VideoCard key={video.key} video={video} />
        ))}
      </div>
    </div>
  );
}
