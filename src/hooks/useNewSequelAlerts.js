import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMovieSequelsTmdb } from "@/lib/tmdb.functions";
import { addNewSequelsToWatchlist, notifyAddedSequels } from "@/lib/autoWatchlist";
import { useMovies } from "@/hooks/useMovies";

// Background safety net, checked once per session: if a watched movie
// belongs to a franchise/collection and a newer part has since released
// that isn't anywhere in the person's library yet, it's added to their
// watchlist automatically and they're notified. This catches sequels that
// come out *after* a movie was already marked watched — the instant case
// (marking a movie watched right now) is handled immediately by
// useUpdateMovie/useAddMovie in useMovies.js, so it doesn't need to wait
// for the app to reload.
export function useNewSequelAlerts() {
  const { data: movies } = useMovies();
  const fetchSequels = useServerFn(getMovieSequelsTmdb);
  const queryClient = useQueryClient();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current || !movies || movies.length === 0) return;

    const watchedMovies = movies.filter(
      (m) => (m.media_type ?? "movie") === "movie" && m.status === "watched",
    );
    if (watchedMovies.length === 0) return;

    checkedRef.current = true;

    (async () => {
      const added = await addNewSequelsToWatchlist({
        fetchSequels,
        tmdbIdsToCheck: watchedMovies.map((m) => Number(m.tmdb_id)),
        library: movies,
      });
      if (added.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["movies"] });
        notifyAddedSequels(added);
      }
    })();
  }, [movies, fetchSequels, queryClient]);
}
