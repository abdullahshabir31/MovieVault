import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getTvSeasonCountsTmdb } from "@/lib/tmdb.functions";
import { useMovies } from "@/hooks/useMovies";

// Watched TV shows are checked against TMDB once per session: if a show now
// has more seasons than it did when it was marked "watched", that means a
// new season aired since the person finished it. It gets moved back to the
// watchlist automatically (and its stored season count updated), so once
// they catch up and mark it "watched" again it's ready to repeat the same
// check the next time a season drops. Only applies to shows already marked
// watched — anything still on the watchlist is left alone.
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
      try {
        const { counts } = await fetchCounts({
          data: { tmdbIds: watchedShows.map((m) => Number(m.tmdb_id)) },
        });
        const latestById = new Map(counts.map((c) => [c.tmdbId, c.number_of_seasons]));

        const moved = [];
        for (const show of watchedShows) {
          const latest = latestById.get(Number(show.tmdb_id));
          if (typeof latest === "number" && latest > show.number_of_seasons) {
            const { error } = await supabase
              .from("movies")
              .update({ status: "watchlist", number_of_seasons: latest })
              .eq("id", show.id);
            if (!error) moved.push(show.title);
          }
        }

        if (moved.length > 0) {
          queryClient.invalidateQueries({ queryKey: ["movies"] });
          moved.forEach((title) => {
            toast.info(`New season of "${title}" is out — moved back to your watchlist.`);
          });
        }
      } catch {
        // Background nicety — failures here shouldn't interrupt the app.
      }
    })();
  }, [movies, fetchCounts, queryClient]);
}
