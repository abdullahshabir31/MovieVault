import { CalendarCheck, CheckCircle2, ListPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MoviePoster } from "@/components/MoviePoster";
import { Rating } from "@/components/Rating";

function formatDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function MovieCard({ movie, onOpen }) {
  const watched = movie.status === "watched";
  const genre = movie.genres?.[0];

  return (
    <button
      type="button"
      onClick={() => onOpen(movie)}
      className="group flex w-full flex-col text-left"
    >
      <div className="relative">
        <MoviePoster
          src={movie.poster_url}
          alt={movie.title}
          className="shadow-card transition-transform duration-300 group-active:scale-[0.98] group-hover:-translate-y-0.5"
        />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-[11px] font-semibold backdrop-blur">
          {watched ? (
            <>
              <CheckCircle2 className="size-3 text-success" /> Watched
            </>
          ) : (
            <>
              <ListPlus className="size-3 text-primary" /> Watchlist
            </>
          )}
        </span>
        {movie.personal_rating ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-background/85 px-2 py-1 backdrop-blur">
            <Rating value={movie.personal_rating} />
          </span>
        ) : null}
      </div>

      <div className="mt-2 space-y-1">
        <h3 className="line-clamp-1 text-sm font-semibold">{movie.title}</h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {movie.release_year ? <span>{movie.release_year}</span> : null}
          {genre ? (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-medium">
              {genre}
            </Badge>
          ) : null}
        </div>
        {watched && movie.watched_date ? (
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarCheck className="size-3" /> {formatDate(movie.watched_date)}
          </p>
        ) : null}
      </div>
    </button>
  );
}

export function MovieRow({ movie, onOpen }) {
  const watched = movie.status === "watched";
  return (
    <button
      type="button"
      onClick={() => onOpen(movie)}
      className="flex w-full gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-card transition-colors hover:border-primary/40"
    >
      <MoviePoster src={movie.poster_url} alt={movie.title} className="h-24 w-16 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="line-clamp-1 text-sm font-semibold">{movie.title}</h3>
        <p className="text-xs text-muted-foreground">
          {[movie.release_year, movie.genres?.slice(0, 2).join(", ")].filter(Boolean).join(" · ")}
        </p>
        {movie.overview ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">{movie.overview}</p>
        ) : null}
        <div className="flex items-center gap-2 pt-0.5">
          {watched ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
              <CheckCircle2 className="size-3" /> Watched
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
              <ListPlus className="size-3" /> Watchlist
            </span>
          )}
          <Rating value={movie.personal_rating} />
        </div>
      </div>
    </button>
  );
}

export { formatDate };
