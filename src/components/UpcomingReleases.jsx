import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { MoviePoster } from "@/components/MoviePoster";
import { formatDate } from "@/components/MovieCard";

// Same "midnight local time" parsing MovieDetails.jsx already uses for
// release_date, so a title flips from upcoming to released at the same
// moment everywhere in the app.
function parseReleaseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function countdownLabel(date) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - startOfToday.getTime()) / msPerDay);

  if (days <= 0) return "Out now";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days < 14) return "In 1 week";
  if (days < 30) return `In ${Math.round(days / 7)} weeks`;
  if (days < 60) return "In 1 month";
  return `In ${Math.round(days / 30)} months`;
}

export function upcomingFromMovies(movies) {
  const now = new Date();
  return (movies ?? [])
    .filter((m) => m.status === "watchlist")
    .map((m) => ({ movie: m, releaseDate: parseReleaseDate(m.release_date) }))
    .filter(({ releaseDate }) => releaseDate && releaseDate > now)
    .sort((a, b) => a.releaseDate.getTime() - b.releaseDate.getTime());
}

export function UpcomingReleases({ movies, onSelect }) {
  const upcoming = useMemo(() => upcomingFromMovies(movies), [movies]);

  if (upcoming.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <h2 className="flex items-center gap-1.5 px-0.5 text-base font-bold tracking-tight">
        <CalendarClock className="size-4 text-amber-500" /> Upcoming releases
      </h2>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {upcoming.map(({ movie, releaseDate }) => (
          <button
            key={movie.id}
            type="button"
            onClick={() => onSelect(movie)}
            className="w-28 shrink-0 text-left sm:w-32"
          >
            <div className="relative">
              <MoviePoster src={movie.poster_url} alt={movie.title} className="w-full" />
              <span className="absolute left-1.5 top-1.5 inline-flex items-center rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur">
                {countdownLabel(releaseDate)}
              </span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug">{movie.title}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {formatDate(movie.release_date)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
