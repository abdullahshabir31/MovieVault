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

// Maps a TMDB movie OR tv object into the shape the app stores/renders.
// mediaTypeHint is used when the raw object doesn't carry media_type itself
// (e.g. results from /movie/popular or /tv/popular, which are type-specific
// endpoints and don't echo media_type back).
function mapItem(m, mediaTypeHint) {
  const mediaType = m.media_type || mediaTypeHint || (m.first_air_date !== undefined ? "tv" : "movie");
  const isTv = mediaType === "tv";
  const releaseDate = isTv ? m.first_air_date : m.release_date;
  return {
    tmdb_id: m.id,
    media_type: mediaType,
    title: m.title || m.name || m.original_title || m.original_name || "Untitled",
    poster_url: m.poster_path ? `${IMG}/w500${m.poster_path}` : null,
    backdrop_url: m.backdrop_path ? `${IMG}/w1280${m.backdrop_path}` : null,
    release_year: releaseDate ? Number(releaseDate.slice(0, 4)) || null : null,
    release_date: releaseDate || null,
    overview: m.overview || "",
    tmdb_rating: typeof m.vote_average === "number" ? Math.round(m.vote_average * 10) / 10 : null,
    genres: Array.isArray(m.genres) ? m.genres.map((g) => g.name) : [],
    runtime: !isTv ? (m.runtime ?? null) : null,
    number_of_seasons: isTv ? (m.number_of_seasons ?? null) : null,
  };
}

// Text search across both movies and TV shows in one call.
export const searchMoviesTmdb = createServerFn({ method: "GET" })
  .validator((input) => z.object({ query: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const json = await tmdbFetch("/search/multi", {
      query: data.query,
      include_adult: "false",
      language: "en-US",
      page: 1,
    });
    const results = (json.results || [])
      .filter((m) => m && m.id && (m.media_type === "movie" || m.media_type === "tv"))
      .slice(0, 20)
      .map((m) => mapItem(m));
    return { results };
  });

export const getMovieTmdb = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({ tmdbId: z.number().int().positive(), mediaType: z.enum(["movie", "tv"]).default("movie") })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const path = data.mediaType === "tv" ? `/tv/${data.tmdbId}` : `/movie/${data.tmdbId}`;
    const json = await tmdbFetch(path, { language: "en-US" });
    return mapItem(json, data.mediaType);
  });

export const getTrendingTmdb = createServerFn({ method: "GET" }).handler(async () => {
  const json = await tmdbFetch("/trending/all/week", { language: "en-US" });
  const results = (json.results || [])
    .filter((m) => m && m.id && (m.media_type === "movie" || m.media_type === "tv"))
    .slice(0, 12)
    .map((m) => mapItem(m));
  return { results };
});

// Full genre list, used to power the category filter chips. Each entry maps
// to a movie genre id and (where TMDB has an equivalent) a TV genre id, so a
// single category shows both movies and TV shows. History, horror, music,
// romance and thriller have no direct TV genre in TMDB, so those categories
// show movies only.
export const ALL_GENRES = [
  { key: "action", title: "Action", genreId: 28, tvGenreId: 10759 },
  { key: "adventure", title: "Adventure", genreId: 12, tvGenreId: 10759 },
  { key: "animation", title: "Animation", genreId: 16, tvGenreId: 16 },
  { key: "comedy", title: "Comedy", genreId: 35, tvGenreId: 35 },
  { key: "crime", title: "Crime", genreId: 80, tvGenreId: 80 },
  { key: "documentary", title: "Documentary", genreId: 99, tvGenreId: 99 },
  { key: "drama", title: "Drama", genreId: 18, tvGenreId: 18 },
  { key: "family", title: "Family", genreId: 10751, tvGenreId: 10751 },
  { key: "fantasy", title: "Fantasy", genreId: 14, tvGenreId: 10765 },
  { key: "history", title: "History", genreId: 36, tvGenreId: null },
  { key: "horror", title: "Horror", genreId: 27, tvGenreId: null },
  { key: "music", title: "Music", genreId: 10402, tvGenreId: null },
  { key: "mystery", title: "Mystery", genreId: 9648, tvGenreId: 9648 },
  { key: "romance", title: "Romance", genreId: 10749, tvGenreId: null },
  { key: "scifi", title: "Science Fiction", genreId: 878, tvGenreId: 10765 },
  { key: "thriller", title: "Thriller", genreId: 53, tvGenreId: null },
  { key: "war", title: "War", genreId: 10752, tvGenreId: 10768 },
  { key: "western", title: "Western", genreId: 37, tvGenreId: 37 },
];

// Central definition of every browse row, used for pagination via getRowPageTmdb.
const ROW_DEFS = [
  { key: "trending", title: "Trending Now", type: "trending" },
  { key: "popular", title: "Popular", type: "popular" },
  { key: "top_rated", title: "Top Rated", type: "top_rated" },
  ...ALL_GENRES.map((g) => ({
    key: g.key,
    title: g.title,
    type: "genre",
    genreId: g.genreId,
    tvGenreId: g.tvGenreId,
  })),
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

// Interleaves two lists (movie results, TV results) so a row/grid shows a mix
// of both rather than all of one type followed by all of the other.
function interleave(a, b) {
  const out = [];
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

function fetchByType(rowDef, mediaType, page) {
  if (mediaType === "movie") {
    if (rowDef.type === "popular") return tmdbFetch("/movie/popular", { language: "en-US", page });
    if (rowDef.type === "top_rated")
      return tmdbFetch("/movie/top_rated", { language: "en-US", page });
    return tmdbFetch("/discover/movie", {
      with_genres: rowDef.genreId,
      sort_by: "popularity.desc",
      include_adult: "false",
      language: "en-US",
      page,
    });
  }
  if (rowDef.type === "popular") return tmdbFetch("/tv/popular", { language: "en-US", page });
  if (rowDef.type === "top_rated") return tmdbFetch("/tv/top_rated", { language: "en-US", page });
  return tmdbFetch("/discover/tv", {
    with_genres: rowDef.tvGenreId,
    sort_by: "popularity.desc",
    language: "en-US",
    page,
  });
}

async function fetchRowPage(rowDef, page) {
  if (rowDef.type === "trending") {
    const json = await tmdbFetch("/trending/all/week", { language: "en-US", page });
    const movies = (json.results || [])
      .filter((m) => m && m.id && (m.media_type === "movie" || m.media_type === "tv"))
      .map((m) => mapItem(m));
    const totalPages = Math.min(json.total_pages || 1, MAX_ROW_PAGES);
    return { movies, hasMore: page < totalPages };
  }

  const wantsTv = rowDef.type !== "genre" || Boolean(rowDef.tvGenreId);
  const [movieJson, tvJson] = await Promise.all([
    fetchByType(rowDef, "movie", page),
    wantsTv ? fetchByType(rowDef, "tv", page) : Promise.resolve(null),
  ]);

  const movieItems = (movieJson?.results || [])
    .filter((m) => m && m.id)
    .map((m) => mapItem(m, "movie"));
  const tvItems = (tvJson?.results || []).filter((m) => m && m.id).map((m) => mapItem(m, "tv"));
  const movies = interleave(movieItems, tvItems);

  const movieTotalPages = Math.min(movieJson?.total_pages || 1, MAX_ROW_PAGES);
  const tvTotalPages = tvJson ? Math.min(tvJson.total_pages || 1, MAX_ROW_PAGES) : 0;
  const hasMore = page < Math.max(movieTotalPages, tvTotalPages);

  return { movies, hasMore };
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
