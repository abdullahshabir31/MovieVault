import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const KEY = ["movies"];

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
  return useMutation({
    mutationFn: async (movie) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("You must be signed in.");

      const payload = {
        user_id: userData.user.id,
        tmdb_id: movie.tmdb_id,
        title: movie.title,
        poster_url: movie.poster_url ?? null,
        backdrop_url: movie.backdrop_url ?? null,
        release_year: movie.release_year ?? null,
        release_date: movie.release_date ?? null,
        overview: movie.overview ?? null,
        genres: movie.genres ?? [],
        tmdb_rating: movie.tmdb_rating ?? null,
        status: movie.status,
        personal_rating: movie.status === "watched" ? (movie.personal_rating ?? null) : null,
        watched_date: movie.status === "watched" ? (movie.watched_date ?? null) : null,
        notes: movie.notes ?? null,
      };

      const { data, error } = await supabase.from("movies").insert(payload).select().single();
      if (error) {
        if (error.code === "23505" || error.code === "23514" || error.code === "23000") throw error;
        if (String(error.message).includes("duplicate key")) {
          throw new Error("This movie is already in your library.");
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
    },
    onError: (error) => toast.error(error.message || "Could not add the movie."),
  });
}

export function useUpdateMovie() {
  const invalidate = useInvalidate();
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
    onSuccess: (_data, vars) => {
      invalidate();
      toast.success(vars.successMessage || "Movie updated");
    },
    onError: (error) => toast.error(error.message || "Could not update the movie."),
  });
}

export function useDeleteMovie() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("movies").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Movie removed from your library");
    },
    onError: (error) => toast.error(error.message || "Could not delete the movie."),
  });
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
