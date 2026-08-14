import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMovieSequelsTmdb } from "@/lib/tmdb.functions";
import { useMovies } from "@/hooks/useMovies";

// Watched movies are checked against TMDB once per session: if a movie
// belongs to a franchise/collection and a newer part has since released
// that isn't anywhere in the person's library yet, it's added to their
// watchlist automatically and they're notified — mirroring the "new
// season" nudge for TV shows, but for movie sequels/franchise entries.
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
      try {
        const existingMovieIds = movies
          .filter((m) => (m.media_type ?? "movie") === "movie")
          .map((m) => Number(m.tmdb_id));

        const { sequels } = await fetchSequels({
          data: {
            tmdbIds: watchedMovies.map((m) => Number(m.tmdb_id)),
            excludeTmdbIds: existingMovieIds,
          },
        });
        if (!sequels || sequels.length === 0) return;

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) return;

        const added = [];
        for (const sequel of sequels) {
          const { error } = await supabase.from("movies").insert({
            user_id: userData.user.id,
            tmdb_id: sequel.tmdb_id,
            media_type: "movie",
            title: sequel.title,
            poster_url: sequel.poster_url,
            backdrop_url: sequel.backdrop_url,
            release_year: sequel.release_year,
            release_date: sequel.release_date,
            overview: sequel.overview,
            genres: sequel.genres ?? [],
            tmdb_rating: sequel.tmdb_rating,
            status: "watchlist",
          });
          // Duplicate-key errors just mean it snuck into the library between
          // the check and now — safe to ignore.
          if (!error) added.push(sequel);
        }

        if (added.length > 0) {
          queryClient.invalidateQueries({ queryKey: ["movies"] });
          added.forEach((sequel) => {
            toast.info(
              sequel.sourceTitle
                ? `"${sequel.title}" is out — added to your watchlist since you watched "${sequel.sourceTitle}".`
                : `"${sequel.title}" is out — added to your watchlist.`,
            );
          });
        }
      } catch {
        // Background nicety — failures here shouldn't interrupt the app.
      }
    })();
  }, [movies, fetchSequels, queryClient]);
}
