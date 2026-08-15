import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clapperboard, Film, PlayCircle, ShieldCheck, Star, Users } from "lucide-react";
import { getMovieExtrasTmdb } from "@/lib/tmdb.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Shared fetch for everything the details popup shows beyond the base title
// info (certification, cast/crew, videos, recommendations). Every component
// below uses the same query key, so opening the details box triggers just
// one network request no matter how many of these sections are on screen.
function useMovieExtras(tmdbId, mediaType, enabled) {
  const fetchExtras = useServerFn(getMovieExtrasTmdb);
  return useQuery({
    queryKey: ["tmdb-extras", mediaType, tmdbId],
    queryFn: () => fetchExtras({ data: { tmdbId, mediaType } }),
    enabled: Boolean(enabled && tmdbId),
    staleTime: 10 * 60_000,
  });
}

// Small age-rating / certification badge for the top badges row (e.g.
// PG-13, U/A 16+, 18+). Renders nothing until it has a value, so it just
// quietly appears once loaded rather than shifting layout with a spinner.
export function CertificationBadge({ tmdbId, mediaType, enabled }) {
  const { data } = useMovieExtras(tmdbId, mediaType, enabled);
  if (!data?.certification) return null;

  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground">
      <ShieldCheck className="size-3" /> {data.certification}
    </span>
  );
}

function PersonCard({ name, subtitle, photoUrl }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-secondary">
        {photoUrl ? (
          <img src={photoUrl} alt={name} loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <Users className="size-5" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug">{name}</p>
        {subtitle ? <p className="text-xs leading-snug text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}

// Button + popup showing the cast (with photos) and director/writers.
export function CastCrewButton({ tmdbId, mediaType, enabled }) {
  const [open, setOpen] = useState(false);
  const { data, isFetching } = useMovieExtras(tmdbId, mediaType, enabled && open);
  const cast = data?.cast ?? [];
  const crew = data?.crew ?? [];
  const hasContent = cast.length > 0 || crew.length > 0;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="h-11 flex-1"
        onClick={() => setOpen(true)}
      >
        <Users className="mr-2 size-4" /> Cast & crew
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cast & crew</DialogTitle>
          </DialogHeader>

          {isFetching && !data ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : !hasContent ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No cast or crew information available.
            </p>
          ) : (
            <div className="space-y-4">
              {crew.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Director & writers
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {crew.map((c) => (
                      <PersonCard
                        key={`${c.id}-${c.job}`}
                        name={c.name}
                        subtitle={c.job}
                        photoUrl={c.photo_url}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {cast.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cast
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {cast.map((c) => (
                      <PersonCard
                        key={c.id}
                        name={c.name}
                        subtitle={c.character}
                        photoUrl={c.photo_url}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

const VIDEO_TYPE_LABEL = {
  Trailer: "Trailer",
  Teaser: "Teaser",
  Clip: "Clip",
  Featurette: "Featurette",
};

// Button + popup listing every YouTube trailer/teaser/clip. Tapping a
// thumbnail swaps it for an inline embedded player rather than leaving the
// app, so everything stays inside the popup.
export function TrailersButton({ tmdbId, mediaType, enabled }) {
  const [open, setOpen] = useState(false);
  const [playingKey, setPlayingKey] = useState(null);
  const { data, isFetching } = useMovieExtras(tmdbId, mediaType, enabled && open);
  const videos = data?.videos ?? [];

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="h-11 flex-1"
        onClick={() => setOpen(true)}
      >
        <Clapperboard className="mr-2 size-4" /> Trailers
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setPlayingKey(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Trailers & videos</DialogTitle>
          </DialogHeader>

          {isFetching && !data ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : videos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No trailers or videos available.
            </p>
          ) : (
            <div className="space-y-3">
              {videos.map((v) => (
                <div key={v.key} className="space-y-1.5">
                  {playingKey === v.key ? (
                    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                      <iframe
                        className="size-full"
                        src={`https://www.youtube.com/embed/${v.key}?autoplay=1`}
                        title={v.name}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPlayingKey(v.key)}
                      className="group relative block aspect-video w-full cursor-pointer overflow-hidden rounded-xl bg-secondary"
                    >
                      <img
                        src={v.thumbnail_url}
                        alt={v.name}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                      <div className="absolute inset-0 grid place-items-center bg-black/30 transition-colors group-hover:bg-black/40">
                        <PlayCircle className="size-12 text-white drop-shadow" />
                      </div>
                      <span className="absolute left-2 top-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-bold backdrop-blur">
                        {VIDEO_TYPE_LABEL[v.type] || v.type}
                      </span>
                    </button>
                  )}
                  <p className="line-clamp-1 text-xs text-muted-foreground">{v.name}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Horizontal scroll row of similar/recommended titles under the details
// box. Clicking a poster hands the movie back up via onSelect so the
// parent can open a fresh details box for it.
export function RecommendationsRow({ tmdbId, mediaType, enabled, onSelect }) {
  const { data } = useMovieExtras(tmdbId, mediaType, enabled);
  // Keep a full-ish list here (capped server-side at 20) — the row's card
  // width already means only ~5 fit in view at once, and scrolling right
  // reveals the rest. Capping the list itself to 5 left nothing to scroll.
  const recommendations = data?.recommendations ?? [];
  if (!enabled || recommendations.length === 0) return null;

  return (
    <div className="mt-5 space-y-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        You might also like
      </p>
      <div
        className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto overscroll-x-contain px-5 pb-1"
        style={{ touchAction: "pan-x" }}
        onWheel={(e) => {
          // Let a plain vertical-mouse-wheel over this row scroll it
          // sideways instead of bubbling up to scroll the whole details
          // box — that's the only case that needs help; touch swipes
          // already stay local via touchAction/overscroll above.
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.currentTarget.scrollLeft += e.deltaY;
            e.preventDefault();
          }
        }}
      >
        {recommendations.map((rec) => (
          <button
            key={`${rec.tmdb_id}-${rec.media_type}`}
            type="button"
            onClick={() => onSelect(rec)}
            className="w-24 shrink-0 text-left sm:w-28"
          >
            <div className="relative aspect-2/3 w-full overflow-hidden rounded-xl bg-secondary">
              {rec.poster_url ? (
                <img
                  src={rec.poster_url}
                  alt={rec.title}
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <div className="grid size-full place-items-center text-muted-foreground">
                  <Film className="size-6" />
                </div>
              )}
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug">{rec.title}</p>
            <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
              {rec.release_year ? <span>{rec.release_year}</span> : null}
              {rec.tmdb_rating ? (
                <span className="inline-flex items-center gap-0.5">
                  <Star className="size-2.5 fill-current" /> {rec.tmdb_rating}
                </span>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
