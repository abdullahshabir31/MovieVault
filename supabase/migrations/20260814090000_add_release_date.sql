-- Adds the full TMDB release date so the app can show the exact release
-- date, and detect movies that haven't been released yet ("upcoming").
ALTER TABLE public.movies ADD COLUMN release_date DATE;
