import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Shared by both the once-per-session background sweep (useNewSequelAlerts)
// and the mutation hooks (useMovies), so a franchise's already-released
// parts land on the watchlist the instant a movie in it is marked watched —
// not only the next time the app happens to reload.
export async function addNewSequelsToWatchlist({ fetchSequels, tmdbIdsToCheck, library }) {
  if (!tmdbIdsToCheck || tmdbIdsToCheck.length === 0) return [];
  try {
    const existingMovieIds = (library ?? [])
      .filter((m) => (m.media_type ?? "movie") === "movie")
      .map((m) => Number(m.tmdb_id));

    const { sequels } = await fetchSequels({
      data: { tmdbIds: tmdbIdsToCheck, excludeTmdbIds: existingMovieIds },
    });
    if (!sequels || sequels.length === 0) return [];

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return [];

    // A title the person deliberately removed from their watchlist before
    // stays removed — it should never come back on its own.
    const { data: dismissedRows } = await supabase
      .from("dismissed_sequels")
      .select("tmdb_id")
      .eq("user_id", userData.user.id)
      .eq("media_type", "movie");
    const dismissed = new Set((dismissedRows ?? []).map((r) => Number(r.tmdb_id)));
    const eligibleSequels = sequels.filter((s) => !dismissed.has(Number(s.tmdb_id)));
    if (eligibleSequels.length === 0) return [];

    const added = [];
    for (const sequel of eligibleSequels) {
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
    return added;
  } catch {
    // Background nicety — failures here shouldn't interrupt the app.
    return [];
  }
}

// Called when the person removes a still-on-the-watchlist title from their
// library, so addNewSequelsToWatchlist knows never to re-add it for them.
export async function dismissSequel({ tmdbId, mediaType }) {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return;
    await supabase.from("dismissed_sequels").insert({
      user_id: userData.user.id,
      tmdb_id: tmdbId,
      media_type: mediaType ?? "movie",
    });
  } catch {
    // Best-effort — worst case it can get suggested again later.
  }
}

export function notifyAddedSequels(added) {
  added.forEach((sequel) => {
    toast.info(
      sequel.sourceTitle
        ? `"${sequel.title}" is out — added to your watchlist since you watched "${sequel.sourceTitle}".`
        : `"${sequel.title}" is out — added to your watchlist.`,
    );
  });
}

// Same idea for TV: if a show already marked "watched" has more seasons
// on TMDB than what was stored when it was finished, a new season has
// since aired, so it's moved back onto the watchlist right away.
export async function moveNewSeasonsToWatchlist({ fetchCounts, showsToCheck }) {
  if (!showsToCheck || showsToCheck.length === 0) return [];
  try {
    const { counts } = await fetchCounts({
      data: { tmdbIds: showsToCheck.map((m) => Number(m.tmdb_id)) },
    });
    const latestById = new Map(counts.map((c) => [c.tmdbId, c.number_of_seasons]));

    const moved = [];
    for (const show of showsToCheck) {
      const latest = latestById.get(Number(show.tmdb_id));
      if (typeof latest === "number" && latest > show.number_of_seasons) {
        const { error } = await supabase
          .from("movies")
          .update({ status: "watchlist", number_of_seasons: latest })
          .eq("id", show.id);
        if (!error) moved.push(show.title);
      }
    }
    return moved;
  } catch {
    return [];
  }
}

export function notifyMovedSeasons(moved) {
  moved.forEach((title) => {
    toast.info(`New season of "${title}" is out — moved back to your watchlist.`);
  });
}
