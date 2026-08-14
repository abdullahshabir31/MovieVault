import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Star } from "lucide-react";
import { MoviePoster } from "@/components/MoviePoster";
import { Skeleton } from "@/components/ui/skeleton";
import { getRowPageTmdb } from "@/lib/tmdb.functions";

export function MovieRow({ rowKey, title, initialMovies, initialHasMore, onSelect, badgeFor }) {
  const fetchPage = useServerFn(getRowPageTmdb);
  const sentinelRef = useRef(null);
  const scrollRef = useRef(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["tmdb-row", rowKey],
    queryFn: ({ pageParam }) => fetchPage({ data: { rowKey, page: pageParam } }),
    initialPageParam: 2,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    initialData: { pages: [], pageParams: [] },
    enabled: false,
  });

  const morePages = data?.pages ?? [];
  const movies = [...initialMovies, ...morePages.flatMap((p) => p.movies)];
  const hasMore = morePages.length > 0 ? morePages[morePages.length - 1].hasMore : initialHasMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root, rootMargin: "0px 300px 0px 0px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetchingNextPage, fetchNextPage]);

  if (!movies || movies.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <h2 className="px-0.5 text-base font-bold tracking-tight">{title}</h2>
      <div ref={scrollRef} className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {movies.map((movie, i) => {
          const badge = badgeFor?.(movie);
          return (
            <button
              key={`${movie.tmdb_id}-${i}`}
              type="button"
              onClick={() => onSelect(movie)}
              className="w-28 shrink-0 text-left sm:w-32"
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

        {hasMore ? (
          <div ref={sentinelRef} className="grid w-10 shrink-0 place-items-center">
            {isFetchingNextPage ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function MovieRowSkeleton() {
  return (
    <div className="space-y-2.5">
      <Skeleton className="h-5 w-36" />
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-28 shrink-0 space-y-1.5 sm:w-32">
            <Skeleton className="aspect-2/3 w-full rounded-2xl" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
