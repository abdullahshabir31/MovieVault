import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMovieSequelsTmdb, getTvSeasonCountsTmdb } from "@/lib/tmdb.functions";
import {
  addNewSequelsToWatchlist,
  moveNewSeasonsToWatchlist,
  notifyAddedSequels,
  notifyMovedSeasons,
  dismissSequel,
} from "@/lib/autoWatchlist";

const KEY = ["movies"];

// After something is marked "watched" (whether that's a fresh add or an
// update to an existing library item), immediately check TMDB for parts of
// that same franchise/show that are already out and not yet in the
// library, and drop them on the watchlist right away — instead of waiting
// for the once-per-session background sweep on the next app load.
async function checkAutoWatchlistFor(movie, { fetchSequels, fetchCounts, queryClient }) {
  if (!movie || movie.status !== "watched") return;
  const mediaType = movie.media_type ?? "movie";

  if (mediaType === "movie") {
    const library = queryClient.getQueryData(KEY) ?? [];
    const added = await addNewSequelsToWatchlist({
      fetchSequels,
      tmdbIdsToCheck: [Number(movie.tmdb_id)],
      library,
    });
    if (added.length > 0) {
      queryClient.invalidateQueries({ queryKey: KEY });
      notifyAddedSequels(added);
    }
    return;
  }

  if (
    mediaType === "tv" &&
    typeof movie.number_of_seasons === "number" &&
    movie.number_of_seasons > 0
  ) {
    const moved = await moveNewSeasonsToWatchlist({ fetchCounts, showsToCheck: [movie] });
    if (moved.length > 0) {
      queryClient.invalidateQueries({ queryKey: KEY });
      notifyMovedSeasons(moved);
    }
  }
}

export function useMovies() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 15_000,
  });
}

export function useMovieByTmdbId(tmdbId) {
  const { data: movies } = useMovies();
  if (!tmdbId || !movies) return null;
  return movies.find((m) => Number(m.tmdb_id) === Number(tmdbId)) ?? null;
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: KEY });
}

export function useAddMovie() {
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  const fetchSequels = useServerFn(getMovieSequelsTmdb);
  const fetchCounts = useServerFn(getTvSeasonCountsTmdb);
  return useMutation({
    mutationFn: async (movie) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("You must be signed in.");

      const payload = {
        user_id: userData.user.id,
        tmdb_id: movie.tmdb_id,
        media_type: movie.media_type ?? "movie",
        title: movie.title,
        poster_url: movie.poster_url ?? null,
        backdrop_url: movie.backdrop_url ?? null,
        release_year: movie.release_year ?? null,
        release_date: movie.release_date ?? null,
        overview: movie.overview ?? null,
        genres: movie.genres ?? [],
        tmdb_rating: movie.tmdb_rating ?? null,
        number_of_seasons: movie.number_of_seasons ?? null,
        status: movie.status,
        personal_rating: movie.status === "watched" ? (movie.personal_rating ?? null) : null,
        watched_date: movie.status === "watched" ? (movie.watched_date ?? null) : null,
        notes: movie.notes ?? null,
      };

      const { data, error } = await supabase.from("movies").insert(payload).select().single();
      if (error) {
        // 23505 is Postgres's own code for "unique constraint violated" —
        // that's exactly the duplicate-title case, so it has to be checked
        // (and given the friendly message) before the generic passthrough
        // below, not after, or the raw Postgres error reaches the user.
        if (error.code === "23505" || String(error.message).includes("duplicate key")) {
          throw new Error("This title is already in your library.");
        }
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      invalidate();
      toast.success(
        data.status === "watched"
          ? `Marked "${data.title}" as watched`
          : `Added "${data.title}" to your watchlist`,
      );
      checkAutoWatchlistFor(data, { fetchSequels, fetchCounts, queryClient });
    },
    onError: (error) => toast.error(error.message || "Could not add the movie."),
  });
}

export function useUpdateMovie() {
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  const fetchSequels = useServerFn(getMovieSequelsTmdb);
  const fetchCounts = useServerFn(getTvSeasonCountsTmdb);
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from("movies")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, vars) => {
      invalidate();
      toast.success(vars.successMessage || "Movie updated");
      // Only worth checking when this update just moved something *into*
      // "watched" — editing notes/rating on an already-watched item, or
      // moving something back to the watchlist, doesn't need a re-check.
      if (vars.updates?.status === "watched") {
        checkAutoWatchlistFor(data, { fetchSequels, fetchCounts, queryClient });
      }
    },
    onError: (error) => toast.error(error.message || "Could not update the movie."),
  });
}

export function useDeleteMovie() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (movie) => {
      const id = typeof movie === "string" ? movie : movie.id;
      const { error } = await supabase.from("movies").delete().eq("id", id);
      if (error) throw error;
      return movie;
    },
    onSuccess: (movie) => {
      invalidate();
      toast.success("Movie removed from your library");
      // Only titles still sitting on the watchlist are ones the
      // auto-add/auto-move checks could ever bring back — a watched title
      // being deleted was never a candidate for that in the first place.
      if (typeof movie === "object" && movie?.status === "watchlist") {
        dismissSequel({ tmdbId: Number(movie.tmdb_id), mediaType: movie.media_type ?? "movie" });
      }
    },
    onError: (error) => toast.error(error.message || "Could not delete the movie."),
  });
}

// Pending deletes live outside React state (module-level) so they survive
// the toast's owning component unmounting — e.g. the user navigates away
// from the page the toast was triggered on before the 5s window is up.
const UNDO_WINDOW_MS = 5000;
const pendingDeletes = new Map(); // id -> timeoutId

export function useDeleteMovieWithUndo() {
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();

  const commitDelete = async (movie) => {
    const id = typeof movie === "string" ? movie : movie.id;
    const { error } = await supabase.from("movies").delete().eq("id", id);
    if (error) {
      // The optimistic removal already happened — bring it back so the
      // library reflects reality instead of silently staying wrong.
      invalidate();
      toast.error(error.message || "Could not delete the movie.");
      return;
    }
    if (typeof movie === "object" && movie?.status === "watchlist") {
      dismissSequel({ tmdbId: Number(movie.tmdb_id), mediaType: movie.media_type ?? "movie" });
    }
  };

  return (movie) => {
    const id = typeof movie === "string" ? movie : movie.id;

    // Optimistically drop it from the cached list right away so the UI
    // updates instantly, without waiting on the network delete.
    queryClient.setQueryData(KEY, (current) => (current ?? []).filter((m) => m.id !== id));

    const timeoutId = setTimeout(() => {
      pendingDeletes.delete(id);
      commitDelete(movie);
    }, UNDO_WINDOW_MS);
    pendingDeletes.set(id, timeoutId);

    toast(`Removed "${movie.title}"`, {
      duration: UNDO_WINDOW_MS,
      action: {
        label: "Undo",
        onClick: () => {
          const pending = pendingDeletes.get(id);
          if (pending) {
            clearTimeout(pending);
            pendingDeletes.delete(id);
          }
          // Nothing was ever deleted server-side, so just restore the
          // cached list to what the server actually has.
          invalidate();
        },
      },
    });
  };
}

export function computeStats(movies) {
  const list = movies ?? [];
  const watched = list.filter((m) => m.status === "watched");
  const watchlist = list.filter((m) => m.status === "watchlist");
  const rated = watched.filter((m) => typeof m.personal_rating === "number");
  const average = rated.length
    ? Math.round((rated.reduce((sum, m) => sum + m.personal_rating, 0) / rated.length) * 10) / 10
    : null;
  return {
    total: list.length,
    watched: watched.length,
    watchlist: watchlist.length,
    average,
  };
}

export function allGenres(movies) {
  const set = new Set();
  (movies ?? []).forEach((m) => (m.genres ?? []).forEach((g) => set.add(g)));
  return [...set].sort();
}

export function allYears(movies) {
  const set = new Set();
  (movies ?? []).forEach((m) => m.release_year && set.add(m.release_year));
  return [...set].sort((a, b) => b - a);
}
