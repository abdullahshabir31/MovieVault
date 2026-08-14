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

// Full TMDB movie-genre list, used to power the category filter chips.
// Every entry here is independently browsable/paginated via getRowPageTmdb,
// even genres that don't have a curated row on the home browse screen.
export const ALL_GENRES = [
  { key: "action", title: "Action", genreId: 28 },
  { key: "adventure", title: "Adventure", genreId: 12 },
  { key: "animation", title: "Animation", genreId: 16 },
  { key: "comedy", title: "Comedy", genreId: 35 },
  { key: "crime", title: "Crime", genreId: 80 },
  { key: "documentary", title: "Documentary", genreId: 99 },
  { key: "drama", title: "Drama", genreId: 18 },
  { key: "family", title: "Family", genreId: 10751 },
  { key: "fantasy", title: "Fantasy", genreId: 14 },
  { key: "history", title: "History", genreId: 36 },
  { key: "horror", title: "Horror", genreId: 27 },
  { key: "music", title: "Music", genreId: 10402 },
  { key: "mystery", title: "Mystery", genreId: 9648 },
  { key: "romance", title: "Romance", genreId: 10749 },
  { key: "scifi", title: "Science Fiction", genreId: 878 },
  { key: "thriller", title: "Thriller", genreId: 53 },
  { key: "war", title: "War", genreId: 10752 },
  { key: "western", title: "Western", genreId: 37 },
];

// Central definition of every browse row, used for pagination via getRowPageTmdb.
const ROW_DEFS = [
  { key: "trending", title: "Trending Now", type: "trending" },
  { key: "popular", title: "Popular Movies", type: "popular" },
  { key: "top_rated", title: "Top Rated", type: "top_rated" },
  ...ALL_GENRES.map((g) => ({ key: g.key, title: g.title, type: "genre", genreId: g.genreId })),
];

// Curated subset shown as Netflix-style rows on the home/"All" browse screen.
const HOME_ROW_KEYS = [
  "trending",
  "popular",
  "action",
  "horror",
  "comedy",
  "adventure",
  "romance",
  "scifi",
  "animation",
  "thriller",
  "top_rated",
];

// Safety cap so a scroll-happy client can't force unlimited upstream TMDB calls.
const MAX_ROW_PAGES = 15;

async function fetchRowPage(rowDef, page) {
  let json;
  if (rowDef.type === "trending") {
    json = await tmdbFetch("/trending/movie/week", { language: "en-US", page });
  } else if (rowDef.type === "popular") {
    json = await tmdbFetch("/movie/popular", { language: "en-US", page });
  } else if (rowDef.type === "top_rated") {
    json = await tmdbFetch("/movie/top_rated", { language: "en-US", page });
  } else {
    json = await tmdbFetch("/discover/movie", {
      with_genres: rowDef.genreId,
      sort_by: "popularity.desc",
      include_adult: "false",
      language: "en-US",
      page,
    });
  }
  const movies = (json.results || []).filter((m) => m && m.id).map(mapMovie);
  const totalPages = Math.min(json.total_pages || 1, MAX_ROW_PAGES);
  return { movies, hasMore: page < totalPages };
}

export const getBrowseRowsTmdb = createServerFn({ method: "GET" }).handler(async () => {
  const homeRowDefs = HOME_ROW_KEYS.map((key) => ROW_DEFS.find((r) => r.key === key)).filter(
    Boolean,
  );
  const pages = await Promise.all(homeRowDefs.map((rowDef) => fetchRowPage(rowDef, 1)));

  const rows = homeRowDefs
    .map((rowDef, i) => ({
      key: rowDef.key,
      title: rowDef.title,
      movies: pages[i].movies,
      hasMore: pages[i].hasMore,
    }))
    .filter((row) => row.movies.length > 0);

  return { rows };
});

export const getRowPageTmdb = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        rowKey: z.enum(ROW_DEFS.map((r) => r.key)),
        page: z.number().int().min(1).max(MAX_ROW_PAGES),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const rowDef = ROW_DEFS.find((r) => r.key === data.rowKey);
    if (!rowDef) throw new Error("Unknown row.");
    const { movies, hasMore } = await fetchRowPage(rowDef, data.page);
    return { movies, page: data.page, hasMore };
  });
