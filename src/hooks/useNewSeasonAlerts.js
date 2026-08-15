import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTvSeasonCountsTmdb } from "@/lib/tmdb.functions";
import { moveNewSeasonsToWatchlist, notifyMovedSeasons } from "@/lib/autoWatchlist";
import { useMovies } from "@/hooks/useMovies";

// Background safety net, checked once per session: if a watched show now
// has more seasons than it did when it was marked "watched", a new season
// aired since. It gets moved back to the watchlist automatically (and its
// stored season count updated). The instant case — marking a show watched
// right now while a newer season is already out — is handled immediately
// by useUpdateMovie/useAddMovie in useMovies.js, so it doesn't need to wait
// for the app to reload. Only applies to shows already marked watched —
// anything still on the watchlist is left alone.
export function useNewSeasonAlerts() {
  const { data: movies } = useMovies();
  const fetchCounts = useServerFn(getTvSeasonCountsTmdb);
  const queryClient = useQueryClient();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current || !movies || movies.length === 0) return;

    const watchedShows = movies.filter(
      (m) =>
        m.media_type === "tv" &&
        m.status === "watched" &&
        typeof m.number_of_seasons === "number" &&
        m.number_of_seasons > 0,
    );
    if (watchedShows.length === 0) return;

    checkedRef.current = true;

    (async () => {
      const moved = await moveNewSeasonsToWatchlist({ fetchCounts, showsToCheck: watchedShows });
      if (moved.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["movies"] });
        notifyMovedSeasons(moved);
      }
    })();
  }, [movies, fetchCounts, queryClient]);
}
