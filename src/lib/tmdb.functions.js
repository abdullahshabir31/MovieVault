import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const IMG = "https://image.tmdb.org/t/p";

function tmdbHeaders(key) {
  return key.startsWith("ey")
    ? { Authorization: `Bearer ${key}`, accept: "application/json" }
    : { accept: "application/json" };
}

function tmdbUrl(path, key, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  if (!key.startsWith("ey")) url.searchParams.set("api_key", key);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });
  return url.toString();
}

async function tmdbFetch(path, params) {
  const key = process.env["TMDB_API_KEY"];
  if (!key) throw new Error("TMDB API key is not configured.");
  const res = await fetch(tmdbUrl(path, key, params), { headers: tmdbHeaders(key) });
  if (!res.ok) {
    throw new Error(`TMDB request failed (${res.status}). Please check the TMDB API key.`);
  }
  return res.json();
}

function mapMovie(m) {
  return {
    tmdb_id: m.id,
    title: m.title || m.original_title || "Untitled",
    poster_url: m.poster_path ? `${IMG}/w500${m.poster_path}` : null,
    backdrop_url: m.backdrop_path ? `${IMG}/w1280${m.backdrop_path}` : null,
    release_year: m.release_date ? Number(m.release_date.slice(0, 4)) || null : null,
    release_date: m.release_date || null,
    overview: m.overview || "",
    tmdb_rating: typeof m.vote_average === "number" ? Math.round(m.vote_average * 10) / 10 : null,
    genres: Array.isArray(m.genres) ? m.genres.map((g) => g.name) : [],
    runtime: m.runtime ?? null,
  };
}

export const searchMoviesTmdb = createServerFn({ method: "GET" })
  .validator((input) => z.object({ query: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const json = await tmdbFetch("/search/movie", {
      query: data.query,
      include_adult: "false",
      language: "en-US",
      page: 1,
    });
    const results = (json.results || [])
      .filter((m) => m && m.id)
      .slice(0, 20)
      .map(mapMovie);
    return { results };
  });

export const getMovieTmdb = createServerFn({ method: "GET" })
  .validator((input) => z.object({ tmdbId: z.number().int().positive() }).parse(input))
  .handler(async ({ data }) => {
    const json = await tmdbFetch(`/movie/${data.tmdbId}`, { language: "en-US" });
    return mapMovie(json);
  });

export const getTrendingTmdb = createServerFn({ method: "GET" }).handler(async () => {
  const json = await tmdbFetch("/trending/movie/week", { language: "en-US" });
  const results = (json.results || []).slice(0, 12).map(mapMovie);
  return { results };
});
