import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const IMG = "https://image.tmdb.org/t/p";

// TMDB's /movie/{id} and /tv/{id} detail endpoints return spoken_languages
// with an english_name per entry, so the original language usually resolves
// straight from that list. This is only a fallback for the rare case where
// the original language itself isn't in that list.
const LANGUAGE_NAME_FALLBACK = {
  en: "English", hi: "Hindi", ur: "Urdu", es: "Spanish", fr: "French",
  de: "German", it: "Italian", ja: "Japanese", ko: "Korean", zh: "Chinese",
  ru: "Russian", pt: "Portuguese", ar: "Arabic", tr: "Turkish", ta: "Tamil",
  te: "Telugu", pa: "Punjabi", th: "Thai", nl: "Dutch", sv: "Swedish",
};

function languageName(iso, spokenLanguages) {
  if (!iso) return null;
  const match = (spokenLanguages || []).find((l) => l.iso_639_1 === iso);
  return match?.english_name || match?.name || LANGUAGE_NAME_FALLBACK[iso] || iso.toUpperCase();
}

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
  const mediaType =
    m.media_type || mediaTypeHint || (m.first_air_date !== undefined ? "tv" : "movie");
  const isTv = mediaType === "tv";
  const releaseDate = isTv ? m.first_air_date : m.release_date;
  // spoken_languages only comes through on the full /movie/{id} or /tv/{id}
  // detail response (not search/discover list results), so this stays empty
  // until a single title's full details are fetched.
  const spokenLanguages = Array.isArray(m.spoken_languages)
    ? m.spoken_languages.map((l) => l.english_name || l.name).filter(Boolean)
    : [];
  return {
    tmdb_id: m.id,
    media_type: mediaType,
    title: m.title || m.name || m.original_title || m.original_name || "Untitled",
    poster_url: m.poster_path ? `${IMG}/w500${m.poster_path}` : null,
    backdrop_url: m.backdrop_path ? `${IMG}/w1280${m.backdrop_path}` : null,
    release_year: releaseDate ? Number(releaseDate.slice(0, 4)) || null : null,
    release_date: releaseDate || null,
    overview: m.overview || "",
    original_language: languageName(m.original_language, m.spoken_languages),
    spoken_languages: spokenLanguages,
    tmdb_rating: typeof m.vote_average === "number" ? Math.round(m.vote_average * 10) / 10 : null,
    genres: Array.isArray(m.genres) ? m.genres.map((g) => g.name) : [],
    runtime: !isTv ? (m.runtime ?? null) : null,
    number_of_seasons: isTv ? (m.number_of_seasons ?? null) : null,
    // Per-season episode counts. Only present on the full /tv/{id} details
    // response (search/discover/browse endpoints don't include this), so
    // this is empty for list results and populated when a single TV show's
    // details are fetched via getMovieTmdb.
    seasons:
      isTv && Array.isArray(m.seasons)
        ? m.seasons
            .filter((s) => s && typeof s.season_number === "number" && s.episode_count > 0)
            .sort((a, b) => a.season_number - b.season_number)
            .map((s) => ({
              season_number: s.season_number,
              name: s.name || (s.season_number === 0 ? "Specials" : `Season ${s.season_number}`),
              episode_count: s.episode_count,
            }))
        : [],
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
      .object({
        tmdbId: z.number().int().positive(),
        mediaType: z.enum(["movie", "tv"]).default("movie"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const path = data.mediaType === "tv" ? `/tv/${data.tmdbId}` : `/movie/${data.tmdbId}`;
    const json = await tmdbFetch(path, { language: "en-US" });
    return mapItem(json, data.mediaType);
  });

// Fetches the full episode list (name, overview, still image, air date) for
// one season of a TV show. Loaded on demand when the person expands a
// season, rather than upfront for every season of every show.
export const getTvSeasonTmdb = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        tmdbId: z.number().int().positive(),
        seasonNumber: z.number().int().min(0),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const json = await tmdbFetch(`/tv/${data.tmdbId}/season/${data.seasonNumber}`, {
      language: "en-US",
    });
    const episodes = (json.episodes || [])
      .filter((e) => e && typeof e.episode_number === "number")
      .sort((a, b) => a.episode_number - b.episode_number)
      .map((e) => ({
        episode_number: e.episode_number,
        name: e.name || `Episode ${e.episode_number}`,
        overview: e.overview || "",
        still_url: e.still_path ? `${IMG}/w300${e.still_path}` : null,
        air_date: e.air_date || null,
        runtime: typeof e.runtime === "number" ? e.runtime : null,
        vote_average:
          typeof e.vote_average === "number" ? Math.round(e.vote_average * 10) / 10 : null,
      }));
    return { episodes };
  });

// Bulk-checks the *current* season count for a set of TV shows. Used to spot
// when a show the person already finished (marked "watched") has aired a new
// season since — so the app can nudge it back onto their watchlist. Only
// number_of_seasons is needed, so this stays a thin wrapper around the same
// /tv/{id} details endpoint used elsewhere.
export const getTvSeasonCountsTmdb = createServerFn({ method: "GET" })
  .validator((input) =>
    z.object({ tmdbIds: z.array(z.number().int().positive()).max(100) }).parse(input),
  )
  .handler(async ({ data }) => {
    const uniqueIds = [...new Set(data.tmdbIds)];
    const counts = await Promise.all(
      uniqueIds.map(async (tmdbId) => {
        try {
          const json = await tmdbFetch(`/tv/${tmdbId}`, { language: "en-US" });
          return { tmdbId, number_of_seasons: json.number_of_seasons ?? null };
        } catch {
          return { tmdbId, number_of_seasons: null };
        }
      }),
    );
    return { counts };
  });

// Checks watched movies for newly-released sequels/franchise entries. For
// each given movie, fetches its TMDB details to find which "collection" (if
// any) it belongs to, then looks at that collection's other parts. Any part
// that's already out (has a past release date) and isn't already anywhere
// in the person's library gets returned as a suggestion, so the app can
// notify them and drop it on their watchlist automatically.
export const getMovieSequelsTmdb = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        tmdbIds: z.array(z.number().int().positive()).max(50),
        excludeTmdbIds: z.array(z.number().int().positive()).max(500).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const uniqueMovieIds = [...new Set(data.tmdbIds)];
    const excludeSet = new Set(data.excludeTmdbIds);

    const details = await Promise.all(
      uniqueMovieIds.map(async (tmdbId) => {
        try {
          return await tmdbFetch(`/movie/${tmdbId}`, { language: "en-US" });
        } catch {
          return null;
        }
      }),
    );

    const collectionByMovie = new Map();
    const collectionIds = new Set();
    details.forEach((d, i) => {
      const collectionId = d?.belongs_to_collection?.id;
      if (collectionId) {
        collectionByMovie.set(uniqueMovieIds[i], collectionId);
        collectionIds.add(collectionId);
      }
    });

    if (collectionIds.size === 0) return { sequels: [] };

    const collections = await Promise.all(
      [...collectionIds].map(async (collectionId) => {
        try {
          const json = await tmdbFetch(`/collection/${collectionId}`, { language: "en-US" });
          return [collectionId, json];
        } catch {
          return [collectionId, null];
        }
      }),
    );
    const collectionById = new Map(collections);

    const today = new Date().toISOString().slice(0, 10);
    const seen = new Set();
    const sequels = [];

    for (const [sourceTmdbId, collectionId] of collectionByMovie) {
      const collection = collectionById.get(collectionId);
      const sourceTitle = details.find((d) => d?.id === sourceTmdbId)?.title;
      if (!collection?.parts) continue;

      for (const part of collection.parts) {
        if (!part || excludeSet.has(part.id) || seen.has(part.id)) continue;
        if (!part.release_date || part.release_date > today) continue;
        seen.add(part.id);
        sequels.push({
          ...mapItem(part, "movie"),
          sourceTitle: sourceTitle || null,
        });
      }
    }

    return { sequels };
  });

// Preferred country order for pulling a certification/age-rating out of
// TMDB's release_dates (movies) / content_ratings (tv) data, which is keyed
// by country. Falls back to the first country that has one at all.
const CERT_COUNTRY_PRIORITY = ["US", "GB", "PK", "IN"];

function extractCertification(json, isTv) {
  if (isTv) {
    const results = json.content_ratings?.results || [];
    for (const country of CERT_COUNTRY_PRIORITY) {
      const match = results.find((r) => r.iso_3166_1 === country && r.rating);
      if (match) return match.rating;
    }
    return results.find((r) => r.rating)?.rating || null;
  }

  const results = json.release_dates?.results || [];
  const certFor = (entry) => entry?.release_dates?.find((rd) => rd.certification)?.certification;
  for (const country of CERT_COUNTRY_PRIORITY) {
    const cert = certFor(results.find((r) => r.iso_3166_1 === country));
    if (cert) return cert;
  }
  for (const entry of results) {
    const cert = certFor(entry);
    if (cert) return cert;
  }
  return null;
}

// Dedupes crew entries by person id (someone can be credited for more than
// one writing job, e.g. "Screenplay" and "Story").
function dedupeById(list) {
  const seen = new Set();
  return list.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

function extractCredits(json) {
  const cast = (json.credits?.cast || []).slice(0, 15).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character || "",
    photo_url: c.profile_path ? `${IMG}/w185${c.profile_path}` : null,
  }));

  const crewRaw = json.credits?.crew || [];
  const directors = dedupeById(crewRaw.filter((c) => c.job === "Director"));
  const writers = dedupeById(
    crewRaw.filter((c) => ["Writer", "Screenplay", "Story", "Author"].includes(c.job)),
  );
  const toCrewEntry = (c) => ({
    id: c.id,
    name: c.name,
    job: c.job,
    photo_url: c.profile_path ? `${IMG}/w185${c.profile_path}` : null,
  });
  const crew = [...directors.map(toCrewEntry), ...writers.map(toCrewEntry)];

  return { cast, crew };
}

function extractVideos(json) {
  const typeRank = { Trailer: 0, Teaser: 1, Clip: 2, Featurette: 3 };
  return (json.videos?.results || [])
    .filter((v) => v.site === "YouTube" && v.key && typeRank[v.type] !== undefined)
    .sort((a, b) => (typeRank[a.type] ?? 9) - (typeRank[b.type] ?? 9))
    .slice(0, 12)
    .map((v) => ({
      key: v.key,
      name: v.name || "Video",
      type: v.type,
      thumbnail_url: `https://img.youtube.com/vi/${v.key}/hqdefault.jpg`,
    }));
}

function extractRecommendations(json, mediaType) {
  return (json.recommendations?.results || [])
    .filter((m) => m && m.id && m.poster_path)
    .slice(0, 20)
    .map((m) => mapItem(m, mediaType));
}

// Fetches everything the details popup needs beyond the base title info in
// a single TMDB request via append_to_response: certification/age rating,
// cast & crew, YouTube trailers/teasers, and "you might also like"
// recommendations. Loaded on demand once the details box is opened.
export const getMovieExtrasTmdb = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        tmdbId: z.number().int().positive(),
        mediaType: z.enum(["movie", "tv"]).default("movie"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const isTv = data.mediaType === "tv";
    const path = isTv ? `/tv/${data.tmdbId}` : `/movie/${data.tmdbId}`;
    const append = isTv
      ? "credits,videos,recommendations,content_ratings"
      : "credits,videos,recommendations,release_dates";
    const json = await tmdbFetch(path, { language: "en-US", append_to_response: append });
    const { cast, crew } = extractCredits(json);
    return {
      certification: extractCertification(json, isTv),
      cast,
      crew,
      videos: extractVideos(json),
      recommendations: extractRecommendations(json, data.mediaType),
    };
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

// Central definition of every browse row, used both for the vertical
// "load more categories" scroll on the browse screen and for pagination of
// items within one row via getRowPageTmdb. Order here is the order rows
// appear in as the user scrolls down.
const ROW_DEFS = [
  { key: "trending", title: "Trending Now", type: "trending" },
  { key: "upcoming", title: "Upcoming", type: "upcoming" },
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

// How many category rows to fetch per "page" as the user scrolls down.
const ROWS_PAGE_SIZE = 4;

// Safety cap so a scroll-happy client can't force unlimited upstream TMDB calls.
const MAX_ROW_PAGES = 15;

// Today's date as YYYY-MM-DD, for TMDB's first_air_date.gte filter.
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

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

// mediaType: "all" keeps the original mixed movie+TV behaviour. "movie" or
// "tv" restricts a row to just that type, using type-specific TMDB endpoints
// so pagination (hasMore) reflects only that type's result count.
async function fetchRowPage(rowDef, page, mediaType = "all") {
  if (mediaType === "movie") {
    if (rowDef.type === "trending") {
      const json = await tmdbFetch("/trending/movie/week", { language: "en-US", page });
      const movies = (json.results || []).filter((m) => m && m.id).map((m) => mapItem(m, "movie"));
      const totalPages = Math.min(json.total_pages || 1, MAX_ROW_PAGES);
      return { movies, hasMore: page < totalPages };
    }
    if (rowDef.type === "upcoming") {
      const json = await tmdbFetch("/movie/upcoming", { language: "en-US", region: "US", page });
      const movies = (json.results || []).filter((m) => m && m.id).map((m) => mapItem(m, "movie"));
      const totalPages = Math.min(json.total_pages || 1, MAX_ROW_PAGES);
      return { movies, hasMore: page < totalPages };
    }
    const movieJson = await fetchByType(rowDef, "movie", page);
    const movies = (movieJson?.results || [])
      .filter((m) => m && m.id)
      .map((m) => mapItem(m, "movie"));
    const totalPages = Math.min(movieJson?.total_pages || 1, MAX_ROW_PAGES);
    return { movies, hasMore: page < totalPages };
  }

  if (mediaType === "tv") {
    if (rowDef.type === "trending") {
      const json = await tmdbFetch("/trending/tv/week", { language: "en-US", page });
      const movies = (json.results || []).filter((m) => m && m.id).map((m) => mapItem(m, "tv"));
      const totalPages = Math.min(json.total_pages || 1, MAX_ROW_PAGES);
      return { movies, hasMore: page < totalPages };
    }
    if (rowDef.type === "upcoming") {
      // TMDB has no dedicated "upcoming TV" endpoint like it does for movies,
      // so this discovers shows whose first air date hasn't happened yet,
      // ranked by popularity so obscure future listings don't crowd out
      // shows people actually anticipate.
      const json = await tmdbFetch("/discover/tv", {
        language: "en-US",
        sort_by: "popularity.desc",
        "first_air_date.gte": todayIso(),
        page,
      });
      const movies = (json.results || []).filter((m) => m && m.id).map((m) => mapItem(m, "tv"));
      const totalPages = Math.min(json.total_pages || 1, MAX_ROW_PAGES);
      return { movies, hasMore: page < totalPages };
    }
    // Genres with no TV equivalent (history, horror, music, romance, thriller)
    // have nothing to show for TV.
    if (rowDef.type === "genre" && !rowDef.tvGenreId) {
      return { movies: [], hasMore: false };
    }
    const tvJson = await fetchByType(rowDef, "tv", page);
    const movies = (tvJson?.results || []).filter((m) => m && m.id).map((m) => mapItem(m, "tv"));
    const totalPages = Math.min(tvJson?.total_pages || 1, MAX_ROW_PAGES);
    return { movies, hasMore: page < totalPages };
  }

  // mediaType === "all": original mixed movie+TV behaviour.
  if (rowDef.type === "trending") {
    const json = await tmdbFetch("/trending/all/week", { language: "en-US", page });
    const movies = (json.results || [])
      .filter((m) => m && m.id && (m.media_type === "movie" || m.media_type === "tv"))
      .map((m) => mapItem(m));
    const totalPages = Math.min(json.total_pages || 1, MAX_ROW_PAGES);
    return { movies, hasMore: page < totalPages };
  }
  if (rowDef.type === "upcoming") {
    const [movieJson, tvJson] = await Promise.all([
      tmdbFetch("/movie/upcoming", { language: "en-US", region: "US", page }),
      tmdbFetch("/discover/tv", {
        language: "en-US",
        sort_by: "popularity.desc",
        "first_air_date.gte": todayIso(),
        page,
      }),
    ]);
    const movieItems = (movieJson?.results || [])
      .filter((m) => m && m.id)
      .map((m) => mapItem(m, "movie"));
    const tvItems = (tvJson?.results || []).filter((m) => m && m.id).map((m) => mapItem(m, "tv"));
    const movies = interleave(movieItems, tvItems);
    const movieTotalPages = Math.min(movieJson?.total_pages || 1, MAX_ROW_PAGES);
    const tvTotalPages = Math.min(tvJson?.total_pages || 1, MAX_ROW_PAGES);
    const hasMore = page < Math.max(movieTotalPages, tvTotalPages);
    return { movies, hasMore };
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

export const getBrowseRowsTmdb = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        mediaType: z.enum(["all", "movie", "tv"]).default("all"),
        offset: z.number().int().min(0).default(0),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const slice = ROW_DEFS.slice(data.offset, data.offset + ROWS_PAGE_SIZE);
    const pages = await Promise.all(slice.map((rowDef) => fetchRowPage(rowDef, 1, data.mediaType)));

    // The "Upcoming" row's title is media-specific ("Upcoming Movies" on the
    // Movies tab, "Upcoming Series" on the TV Series tab) even though the
    // row definition itself is shared between both tabs.
    const rowTitle = (rowDef) => {
      if (rowDef.key !== "upcoming") return rowDef.title;
      if (data.mediaType === "movie") return "Upcoming Movies";
      if (data.mediaType === "tv") return "Upcoming Series";
      return rowDef.title;
    };

    const rows = slice
      .map((rowDef, i) => ({
        key: rowDef.key,
        title: rowTitle(rowDef),
        movies: pages[i].movies,
        hasMore: pages[i].hasMore,
      }))
      .filter((row) => row.movies.length > 0);

    const nextOffset = data.offset + ROWS_PAGE_SIZE;
    const hasMoreRows = nextOffset < ROW_DEFS.length;

    return { rows, nextOffset, hasMoreRows };
  });

export const getRowPageTmdb = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        rowKey: z.enum(ROW_DEFS.map((r) => r.key)),
        page: z.number().int().min(1).max(MAX_ROW_PAGES),
        mediaType: z.enum(["all", "movie", "tv"]).default("all"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const rowDef = ROW_DEFS.find((r) => r.key === data.rowKey);
    if (!rowDef) throw new Error("Unknown row.");
    const { movies, hasMore } = await fetchRowPage(rowDef, data.page, data.mediaType);
    return { movies, page: data.page, hasMore };
  });
