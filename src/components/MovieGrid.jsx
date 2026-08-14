import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Star } from "lucide-react";
import { MoviePoster } from "@/components/MoviePoster";
import { getRowPageTmdb } from "@/lib/tmdb.functions";
import { MovieGridSkeleton } from "@/components/LoadingState";

export function MovieGrid({ rowKey, initialMovies, initialHasMore, onSelect, badgeFor }) {
  const fetchPage = useServerFn(getRowPageTmdb);
  const sentinelRef = useRef(null);
  const hasInitial = Array.isArray(initialMovies);

  const { data, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["tmdb-row", rowKey],
    queryFn: ({ pageParam }) => fetchPage({ data: { rowKey, page: pageParam } }),
    initialPageParam: hasInitial ? 2 : 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    initialData: hasInitial ? { pages: [], pageParams: [] } : undefined,
    enabled: !hasInitial,
  });

  const morePages = data?.pages ?? [];
  const movies = hasInitial
    ? [...initialMovies, ...morePages.flatMap((p) => p.movies)]
    : morePages.flatMap((p) => p.movies);
  const hasMore =
    morePages.length > 0 ? morePages[morePages.length - 1].hasMore : (initialHasMore ?? true);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetchingNextPage, fetchNextPage]);

  if (!movies || movies.length === 0) return <MovieGridSkeleton />;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {movies.map((movie, i) => {
          const badge = badgeFor?.(movie);
          return (
            <button
              key={`${movie.tmdb_id}-${i}`}
              type="button"
              onClick={() => onSelect(movie)}
              className="text-left"
            >
              <div className="relative">
                <MoviePoster src={movie.poster_url} alt={movie.title} className="w-full" />
                {badge ? (
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-bold text-foreground shadow-sm backdrop-blur">
                    {badge}
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug">{movie.title}</p>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                {movie.release_year ? <span>{movie.release_year}</span> : null}
                {movie.tmdb_rating ? (
                  <span className="inline-flex items-center gap-0.5">
                    <Star className="size-2.5 fill-current" /> {movie.tmdb_rating}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {hasMore ? (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {isFetchingNextPage ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
