import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Film, Layers, Loader2, Star } from "lucide-react";
import { getMovieTmdb, getTvSeasonTmdb } from "@/lib/tmdb.functions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Detail popup for a single episode — bigger still, full overview, and
// every stat we have (air date, runtime, rating).
function EpisodeDetailsDialog({ episode, seasonNumber, open, onOpenChange }) {
  if (!episode) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-3 p-0 overflow-hidden">
        <div className="aspect-video w-full shrink-0 overflow-hidden bg-secondary">
          {episode.still_url ? (
            <img src={episode.still_url} alt={episode.name} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              <Film className="size-8" />
            </div>
          )}
        </div>
        <div className="space-y-2 px-5 pb-5">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base leading-snug">
              S{seasonNumber} · E{episode.episode_number} — {episode.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {episode.air_date ? <span>{episode.air_date}</span> : null}
            {episode.runtime ? <span>{episode.runtime} min</span> : null}
            {episode.vote_average ? (
              <span className="flex items-center gap-1">
                <Star className="size-3.5 fill-current" /> {episode.vote_average}
              </span>
            ) : null}
          </div>
          {episode.overview ? (
            <p className="text-sm text-muted-foreground">{episode.overview}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No overview available.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Episode list for one season — image, name, air date, and overview per
// episode. Fetched only once its season is expanded.
function SeasonEpisodes({ tmdbId, seasonNumber, open }) {
  const fetchSeason = useServerFn(getTvSeasonTmdb);
  const [selectedEpisode, setSelectedEpisode] = useState(null);

  const { data, isFetching, isError } = useQuery({
    queryKey: ["tmdb-tv-season-episodes", tmdbId, seasonNumber],
    queryFn: () => fetchSeason({ data: { tmdbId, seasonNumber } }),
    enabled: open,
    staleTime: 10 * 60_000,
  });

  if (!open) return null;

  if (isFetching && !data) {
    return (
      <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Loading episodes…
      </div>
    );
  }

  const episodes = data?.episodes ?? [];
  if (isError || episodes.length === 0) {
    return <p className="px-2 py-3 text-xs text-muted-foreground">No episode details available.</p>;
  }

  return (
    <div className="space-y-1.5 py-2">
      {episodes.map((ep) => (
        <button
          type="button"
          key={ep.episode_number}
          onClick={() => setSelectedEpisode(ep)}
          className="flex w-full gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-background/70 cursor-pointer"
        >
          <div className="h-16 w-28 shrink-0 overflow-hidden rounded-md bg-secondary">
            {ep.still_url ? (
              <img src={ep.still_url} alt={ep.name} className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-muted-foreground">
                <Film className="size-4" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold leading-snug">
              {ep.episode_number}. {ep.name}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-muted-foreground">
              {ep.air_date ? <span>{ep.air_date}</span> : null}
              {ep.runtime ? <span>· {ep.runtime}m</span> : null}
              {ep.vote_average ? <span>· ★ {ep.vote_average}</span> : null}
            </div>
            {ep.overview ? (
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{ep.overview}</p>
            ) : null}
          </div>
        </button>
      ))}
      <EpisodeDetailsDialog
        episode={selectedEpisode}
        seasonNumber={seasonNumber}
        open={Boolean(selectedEpisode)}
        onOpenChange={(next) => !next && setSelectedEpisode(null)}
      />
    </div>
  );
}

// Shows every season of a TV show, each expandable to reveal its full
// episode list. Fetches the season/episode-count summary on demand — list
// and search results only carry a season *count*, not the breakdown.
export function SeriesSeasons({ tmdbId, enabled }) {
  const fetchMovie = useServerFn(getMovieTmdb);
  const [expandedSeason, setExpandedSeason] = useState(null);

  const { data, isFetching, isError } = useQuery({
    // Shared with MovieLanguages so the two don't both fetch full TV details
    // independently when the same details box is open.
    queryKey: ["tmdb-full-details", "tv", tmdbId],
    queryFn: () => fetchMovie({ data: { tmdbId, mediaType: "tv" } }),
    enabled: Boolean(enabled && tmdbId),
    staleTime: 10 * 60_000,
  });

  if (!enabled || !tmdbId) return null;

  if (isFetching && !data) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Loading seasons…
      </div>
    );
  }

  const seasons = data?.seasons ?? [];
  if (isError || seasons.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Layers className="size-3.5" /> Seasons & episodes
      </p>
      <div className="max-h-96 space-y-1 overflow-y-auto rounded-xl border border-border bg-surface p-2">
        {seasons.map((season) => {
          const isOpen = expandedSeason === season.season_number;
          return (
            <Collapsible
              key={season.season_number}
              open={isOpen}
              onOpenChange={(next) => setExpandedSeason(next ? season.season_number : null)}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm">
                <span className="font-medium">{season.name}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  {season.episode_count} {season.episode_count === 1 ? "episode" : "episodes"}
                  <ChevronDown
                    className={cn("size-3.5 transition-transform", isOpen && "rotate-180")}
                  />
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-1">
                <SeasonEpisodes tmdbId={tmdbId} seasonNumber={season.season_number} open={isOpen} />
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
