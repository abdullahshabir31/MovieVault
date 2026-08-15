-- Remembers a title (tmdb_id + media_type) that the user removed from
-- their watchlist, so the sequel/new-season auto-watchlist checks
-- (src/lib/autoWatchlist.js) never re-add it for that user again.
CREATE TABLE public.dismissed_sequels (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tmdb_id BIGINT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'movie' CHECK (media_type IN ('movie', 'tv')),
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tmdb_id, media_type)
);
GRANT SELECT, INSERT, DELETE ON public.dismissed_sequels TO authenticated;
GRANT ALL ON public.dismissed_sequels TO service_role;
ALTER TABLE public.dismissed_sequels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dismissed_sequels_select_own" ON public.dismissed_sequels FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "dismissed_sequels_insert_own" ON public.dismissed_sequels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dismissed_sequels_delete_own" ON public.dismissed_sequels FOR DELETE TO authenticated USING (auth.uid() = user_id);
