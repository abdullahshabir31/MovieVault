import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, ListPlus, Loader2, Tv } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RatingPicker } from "@/components/Rating";
import { MoviePoster } from "@/components/MoviePoster";
import { SeriesSeasons } from "@/components/SeriesSeasons";
import { formatDate } from "@/components/MovieCard";
import { cn } from "@/lib/utils";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function MovieFormDialog({
  open,
  onOpenChange,
  movie,
  initialStatus = "watchlist",
  title = "Add to your library",
  submitLabel = "Save",
  lockStatus = false,
  pending = false,
  onSubmit,
}) {
  const [status, setStatus] = useState(initialStatus);
  const [rating, setRating] = useState(null);
  const [watchedDate, setWatchedDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !movie) return;
    setStatus(initialStatus);
    setRating(movie.personal_rating ?? null);
    setWatchedDate(movie.watched_date ?? "");
    setNotes(movie.notes ?? "");
  }, [open, movie, initialStatus]);

  if (!movie) return null;
  const isTv = movie.media_type === "tv";
  const releaseDate = movie.release_date ? new Date(`${movie.release_date}T00:00:00`) : null;
  const isUpcoming =
    releaseDate && !Number.isNaN(releaseDate.getTime()) && releaseDate > new Date();

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      status,
      personal_rating: status === "watched" ? rating : null,
      watched_date: status === "watched" ? watchedDate || null : null,
      notes: notes.trim() ? notes.trim() : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {movie.title}
            {movie.release_year ? ` (${movie.release_year})` : ""}
          </DialogDescription>
          {isTv ? (
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Tv className="size-3.5" /> TV Series
              {movie.number_of_seasons
                ? ` · ${movie.number_of_seasons} ${movie.number_of_seasons === 1 ? "season" : "seasons"}`
                : ""}
            </p>
          ) : null}
          {isUpcoming ? (
            <p className="flex items-center gap-1 text-xs font-medium text-amber-500">
              <CalendarClock className="size-3.5" /> Upcoming · Releases{" "}
              {formatDate(movie.release_date)}
            </p>
          ) : movie.release_date ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" /> Released {formatDate(movie.release_date)}
            </p>
          ) : null}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-3">
            <MoviePoster src={movie.poster_url} alt={movie.title} className="h-32 w-22 shrink-0" />
            <p className="line-clamp-6 text-xs text-muted-foreground">{movie.overview}</p>
          </div>

          {isTv ? <SeriesSeasons tmdbId={movie.tmdb_id} enabled={open} /> : null}

          {!lockStatus ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus("watched")}
                className={cn(
                  "flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold",
                  status === "watched"
                    ? "border-success bg-success/15 text-success"
                    : "border-border bg-secondary text-secondary-foreground",
                )}
              >
                <CheckCircle2 className="size-4" /> Watched
              </button>
              <button
                type="button"
                onClick={() => setStatus("watchlist")}
                className={cn(
                  "flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold",
                  status === "watchlist"
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-secondary text-secondary-foreground",
                )}
              >
                <ListPlus className="size-4" /> Watchlist
              </button>
            </div>
          ) : null}

          {status === "watched" ? (
            <>
              <div className="space-y-2">
                <Label>Your rating</Label>
                <RatingPicker value={rating} onChange={setRating} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="watched-date">Watched on (optional)</Label>
                <Input
                  id="watched-date"
                  type="date"
                  value={watchedDate ?? ""}
                  max={today()}
                  onChange={(event) => setWatchedDate(event.target.value)}
                  className="h-12"
                />
              </div>
            </>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="notes">Personal notes</Label>
            <Textarea
              id="notes"
              value={notes}
              placeholder="Great watch. The ending was amazing."
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="h-12 flex-1 sm:flex-none">
              {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
