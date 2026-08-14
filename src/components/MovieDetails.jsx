import { useState } from "react";
import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Film,
  ListPlus,
  Loader2,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MovieFormDialog } from "@/components/MovieFormDialog";
import { Rating } from "@/components/Rating";
import { formatDate } from "@/components/MovieCard";
import { useDeleteMovie, useUpdateMovie } from "@/hooks/useMovies";

export function MovieDetails({ movie, open, onOpenChange }) {
  const [editing, setEditing] = useState(false);
  const [markWatched, setMarkWatched] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const updateMovie = useUpdateMovie();
  const deleteMovie = useDeleteMovie();

  if (!movie) return null;
  const watched = movie.status === "watched";
  const releaseDate = movie.release_date ? new Date(`${movie.release_date}T00:00:00`) : null;
  const isUpcoming = releaseDate && !Number.isNaN(releaseDate.getTime()) && releaseDate > new Date();

  const moveToWatchlist = () => {
    updateMovie.mutate({
      id: movie.id,
      updates: { status: "watchlist", personal_rating: null, watched_date: null },
      successMessage: `Moved "${movie.title}" to your watchlist`,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
          <div className="relative">
            <div className="relative h-44 w-full overflow-hidden bg-secondary sm:h-56">
              {movie.backdrop_url || movie.poster_url ? (
                <img
                  src={movie.backdrop_url || movie.poster_url}
                  alt={`${movie.title} backdrop`}
                  className="size-full object-cover"
                />
              ) : (
                <div className="grid size-full place-items-center text-muted-foreground">
                  <Film className="size-10" />
                </div>
              )}
              <div className="absolute inset-0 gradient-cinema" />
            </div>

            <div className="-mt-14 px-5 pb-6">
              <div className="flex items-end gap-3">
                {movie.poster_url ? (
                  <img
                    src={movie.poster_url}
                    alt={`${movie.title} poster`}
                    className="h-32 w-22 shrink-0 rounded-xl object-cover shadow-card"
                  />
                ) : null}
                <div className="pb-1">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
                      watched ? "bg-success/15 text-success" : "bg-primary/15 text-primary"
                    }`}
                  >
                    {watched ? (
                      <>
                        <CheckCircle2 className="size-3" /> Watched
                      </>
                    ) : (
                      <>
                        <ListPlus className="size-3" /> Watchlist
                      </>
                    )}
                  </span>
                  {isUpcoming ? (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-500">
                      <CalendarClock className="size-3" /> Upcoming
                    </span>
                  ) : null}
                </div>
              </div>

              <DialogHeader className="mt-4 text-left">
                <DialogTitle className="text-2xl">{movie.title}</DialogTitle>
                <DialogDescription>
                  {[movie.release_year, movie.genres?.join(" · ")].filter(Boolean).join(" • ")}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {movie.tmdb_rating ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Star className="size-3.5" /> TMDB {movie.tmdb_rating}
                  </span>
                ) : null}
                <Rating value={movie.personal_rating} size="lg" />
                {watched && movie.watched_date ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarCheck className="size-3.5" /> {formatDate(movie.watched_date)}
                  </span>
                ) : null}
                {isUpcoming ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500">
                    <CalendarClock className="size-3.5" /> Releases {formatDate(movie.release_date)}
                  </span>
                ) : movie.release_date ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" /> {formatDate(movie.release_date)}
                  </span>
                ) : null}
              </div>

              {movie.genres?.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {movie.genres.map((genre) => (
                    <Badge key={genre} variant="secondary">
                      {genre}
                    </Badge>
                  ))}
                </div>
              ) : null}

              {movie.overview ? (
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {movie.overview}
                </p>
              ) : null}

              {movie.notes ? (
                <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Your notes
                  </p>
                  <p className="mt-1 text-sm">{movie.notes}</p>
                </div>
              ) : null}

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {watched ? (
                  <Button variant="secondary" className="h-12" onClick={moveToWatchlist}>
                    {updateMovie.isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <ListPlus className="mr-2 size-4" />
                    )}
                    Move to watchlist
                  </Button>
                ) : (
                  <Button className="h-12" onClick={() => setMarkWatched(true)}>
                    <CheckCircle2 className="mr-2 size-4" /> Mark as watched
                  </Button>
                )}
                <Button variant="secondary" className="h-12" onClick={() => setEditing(true)}>
                  <Pencil className="mr-2 size-4" /> Edit details
                </Button>
                <Button
                  variant="ghost"
                  className="h-12 text-destructive hover:text-destructive sm:col-span-2"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="mr-2 size-4" /> Delete from library
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MovieFormDialog
        open={editing}
        onOpenChange={setEditing}
        movie={movie}
        initialStatus={movie.status}
        title="Edit movie"
        submitLabel="Save changes"
        pending={updateMovie.isPending}
        onSubmit={(values) => {
          updateMovie.mutate(
            { id: movie.id, updates: values, successMessage: "Movie updated" },
            { onSuccess: () => setEditing(false) },
          );
        }}
      />

      <MovieFormDialog
        open={markWatched}
        onOpenChange={setMarkWatched}
        movie={movie}
        initialStatus="watched"
        lockStatus
        title="Mark as watched"
        submitLabel="Save"
        pending={updateMovie.isPending}
        onSubmit={(values) => {
          updateMovie.mutate(
            {
              id: movie.id,
              updates: { ...values, status: "watched" },
              successMessage: `Marked "${movie.title}" as watched`,
            },
            { onSuccess: () => setMarkWatched(false) },
          );
        }}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{movie.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the movie, your rating and your notes from your library. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteMovie.mutate(movie.id, {
                  onSuccess: () => {
                    setConfirmDelete(false);
                    onOpenChange(false);
                  },
                })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
