// Scheduled Edge Function — deployed with:
//   supabase functions deploy check-new-releases
// and invoked on a cron schedule (e.g. every 6h) via Supabase Dashboard →
// Edge Functions → check-new-releases → Cron, or `pg_cron` calling it over
// HTTP. Not triggered by the client at all: this is what makes new-sequel /
// new-season alerts reach people even when MovieVault isn't open, which is
// the whole point of doing this here instead of only in the browser (see
// src/lib/autoWatchlist.js for the client-side version of this same check).
//
// Required secrets (set with `supabase secrets set NAME=value`):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — provided automatically
//   TMDB_API_KEY       — same key the app already uses
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT — from
//     `npx web-push generate-vapid-keys`; VAPID_SUBJECT is a mailto: URL
//   CRON_SECRET         — shared secret the caller must send as
//     `Authorization: Bearer <CRON_SECRET>`, so this can't be triggered by
//     anyone who finds the URL

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const TMDB_BASE = "https://api.themoviedb.org/3";

function tmdbHeaders(key: string) {
  return key.startsWith("ey")
    ? { Authorization: `Bearer ${key}`, accept: "application/json" }
    : { accept: "application/json" };
}

function tmdbUrl(path: string, key: string, params: Record<string, string> = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  if (!key.startsWith("ey")) url.searchParams.set("api_key", key);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

async function tmdbFetch(path: string, tmdbKey: string, params?: Record<string, string>) {
  const res = await fetch(tmdbUrl(path, tmdbKey, params), { headers: tmdbHeaders(tmdbKey) });
  if (!res.ok) throw new Error(`TMDB ${path} failed (${res.status})`);
  return res.json();
}

function mapPart(m: any) {
  return {
    tmdb_id: m.id,
    media_type: "movie",
    title: m.title || m.original_title || "Untitled",
    poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    backdrop_url: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
    release_year: m.release_date ? Number(m.release_date.slice(0, 4)) || null : null,
    release_date: m.release_date || null,
    overview: m.overview || "",
    genres: [],
    tmdb_rating: typeof m.vote_average === "number" ? Math.round(m.vote_average * 10) / 10 : null,
  };
}

// Mirrors addNewSequelsToWatchlist in src/lib/autoWatchlist.js, but for one
// user's whole watched-movies list at once instead of a single just-watched
// title, since this runs periodically rather than reacting to one mutation.
async function findNewSequels(
  tmdbKey: string,
  watchedMovieIds: number[],
  libraryIds: Set<number>,
  dismissedIds: Set<number>,
) {
  const uniqueIds = [...new Set(watchedMovieIds)];
  const details = await Promise.all(
    uniqueIds.map((id) => tmdbFetch(`/movie/${id}`, tmdbKey, { language: "en-US" }).catch(() => null)),
  );

  const collectionIds = new Set<number>();
  details.forEach((d) => {
    if (d?.belongs_to_collection?.id) collectionIds.add(d.belongs_to_collection.id);
  });
  if (collectionIds.size === 0) return [];

  const collections = await Promise.all(
    [...collectionIds].map((id) =>
      tmdbFetch(`/collection/${id}`, tmdbKey, { language: "en-US" }).catch(() => null),
    ),
  );

  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set<number>();
  const sequels: ReturnType<typeof mapPart>[] = [];

  for (const collection of collections) {
    if (!collection?.parts) continue;
    for (const part of collection.parts) {
      if (!part || seen.has(part.id) || libraryIds.has(part.id) || dismissedIds.has(part.id)) continue;
      if (!part.release_date || part.release_date > today) continue;
      seen.add(part.id);
      sequels.push(mapPart(part));
    }
  }
  return sequels;
}

// Mirrors moveNewSeasonsToWatchlist: any watched show whose TMDB season
// count now exceeds what we stored has a new season out.
async function findNewSeasons(tmdbKey: string, shows: { id: string; tmdb_id: number; number_of_seasons: number | null }[]) {
  const moved: { id: string; latest: number }[] = [];
  for (const show of shows) {
    try {
      const json = await tmdbFetch(`/tv/${show.tmdb_id}`, tmdbKey, { language: "en-US" });
      const latest = json.number_of_seasons ?? null;
      if (typeof latest === "number" && typeof show.number_of_seasons === "number" && latest > show.number_of_seasons) {
        moved.push({ id: show.id, latest });
      }
    } catch {
      // Skip — best-effort, same as the client-side version.
    }
  }
  return moved;
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const tmdbKey = Deno.env.get("TMDB_API_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");
  if (!tmdbKey || !vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return new Response("Missing required secrets", { status: 500 });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");
  if (subsError) return new Response(subsError.message, { status: 500 });

  const userIds = [...new Set((subs ?? []).map((s) => s.user_id))];
  const results: Record<string, { added: number }> = {};

  for (const userId of userIds) {
    const { data: library } = await supabase.from("movies").select("*").eq("user_id", userId);
    const list = library ?? [];
    const watchedMovies = list.filter((m) => m.status === "watched" && (m.media_type ?? "movie") === "movie");
    const watchedShows = list.filter(
      (m) => m.status === "watched" && m.media_type === "tv" && typeof m.number_of_seasons === "number",
    );
    if (watchedMovies.length === 0 && watchedShows.length === 0) continue;

    const movieLibraryIds = new Set(
      list.filter((m) => (m.media_type ?? "movie") === "movie").map((m) => Number(m.tmdb_id)),
    );
    const { data: dismissedRows } = await supabase
      .from("dismissed_sequels")
      .select("tmdb_id")
      .eq("user_id", userId)
      .eq("media_type", "movie");
    const dismissedIds = new Set((dismissedRows ?? []).map((r) => Number(r.tmdb_id)));

    const newSequels = await findNewSequels(
      tmdbKey,
      watchedMovies.map((m) => Number(m.tmdb_id)),
      movieLibraryIds,
      dismissedIds,
    );
    const newSeasons = await findNewSeasons(tmdbKey, watchedShows);

    let added = 0;
    for (const sequel of newSequels) {
      const { error } = await supabase.from("movies").insert({ user_id: userId, status: "watchlist", ...sequel });
      if (!error) added += 1;
    }
    for (const { id, latest } of newSeasons) {
      const { error } = await supabase
        .from("movies")
        .update({ status: "watchlist", number_of_seasons: latest })
        .eq("id", id);
      if (!error) added += 1;
    }
    results[userId] = { added };
    if (added === 0) continue;

    const body =
      added === 1
        ? "A new sequel or season just landed on your watchlist."
        : `${added} new sequels/seasons just landed on your watchlist.`;
    const payload = JSON.stringify({ title: "MovieVault", body, url: "/watchlist" });

    const userSubs = (subs ?? []).filter((s) => s.user_id === userId);
    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
      } catch (err: any) {
        // 404/410 means the browser dropped the subscription — clean it up
        // so future runs don't keep retrying a dead endpoint.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", userId)
            .eq("endpoint", sub.endpoint);
        }
      }
    }
  }

  return new Response(JSON.stringify({ checked: userIds.length, results }), {
    headers: { "content-type": "application/json" },
  });
});
