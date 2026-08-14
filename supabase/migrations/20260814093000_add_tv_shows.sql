-- Adds TV show support alongside movies: a media_type column so the same
-- table can hold both, and number_of_seasons for series. The uniqueness
-- constraint is widened to (user_id, tmdb_id, media_type) since a movie and
-- a TV show can share the same numeric TMDB id.
ALTER TABLE public.movies
  ADD COLUMN media_type TEXT NOT NULL DEFAULT 'movie' CHECK (media_type IN ('movie', 'tv'));

ALTER TABLE public.movies ADD COLUMN number_of_seasons INTEGER;

ALTER TABLE public.movies DROP CONSTRAINT IF EXISTS movies_user_id_tmdb_id_key;
ALTER TABLE public.movies ADD CONSTRAINT movies_user_tmdb_media_key UNIQUE (user_id, tmdb_id, media_type);
