import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Tv } from "lucide-react";
import { getMovieTmdb } from "@/lib/tmdb.functions";

function ProviderLogo({ provider }) {
  return (
    <div className="flex w-14 shrink-0 flex-col items-center gap-1 text-center">
      <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-secondary shadow-sm">
        {provider.logo_url ? (
          <img src={provider.logo_url} alt={provider.name} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <Tv className="size-4" />
          </div>
        )}
      </div>
      <p className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">
        {provider.name}
      </p>
    </div>
  );
}

// "Available on" section — where to stream/rent/buy the title, region-wise
// (Pakistan when TMDB/JustWatch has a listing, otherwise US). Shares the
// same "tmdb-full-details" query key as the other on-demand sections, so it
// never adds its own TMDB request.
export function MovieWatchProviders({ tmdbId, mediaType, enabled }) {
  const fetchMovie = useServerFn(getMovieTmdb);

  const { data, isFetching } = useQuery({
    queryKey: ["tmdb-full-details", mediaType, tmdbId],
    queryFn: () => fetchMovie({ data: { tmdbId, mediaType } }),
    enabled: Boolean(enabled && tmdbId),
    staleTime: 10 * 60_000,
  });

  if (!enabled || !tmdbId || isFetching) return null;

  const providers = data?.watch_providers;
  if (!providers) return null;

  // Prefer subscription (flatrate) listings; only fall back to rent/buy
  // when the title isn't on any subscription service in this region.
  const shown =
    providers.flatrate.length > 0 ? providers.flatrate : [...providers.rent, ...providers.buy];
  if (shown.length === 0) return null;

  const content = (
    <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
      {shown.map((provider) => (
        <ProviderLogo key={provider.id} provider={provider} />
      ))}
    </div>
  );

  return (
    <div className="mt-4 space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Tv className="size-3.5" /> Available on
        {providers.country === "US" ? (
          <span className="normal-case tracking-normal text-muted-foreground/70">(US)</span>
        ) : null}
      </p>
      {providers.link ? (
        <a href={providers.link} target="_blank" rel="noopener noreferrer" className="block">
          {content}
        </a>
      ) : (
        content
      )}
      <p className="text-[10px] text-muted-foreground/70">Streaming data by JustWatch</p>
    </div>
  );
}
