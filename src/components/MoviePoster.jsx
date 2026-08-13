import { Film } from "lucide-react";
import { cn } from "@/lib/utils";

export function MoviePoster({ src, alt, className }) {
  return (
    <div
      className={cn(
        "relative aspect-2/3 w-full overflow-hidden rounded-2xl bg-secondary",
        className,
      )}
    >
      {src ? (
        <img src={src} alt={`${alt} poster`} loading="lazy" className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-muted-foreground">
          <Film className="size-8" />
        </div>
      )}
    </div>
  );
}
