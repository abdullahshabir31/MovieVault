import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Rating({ value, className, size = "sm" }) {
  if (value === null || value === undefined) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold text-primary",
        size === "lg" ? "text-base" : "text-xs",
        className,
      )}
    >
      <Star className={size === "lg" ? "size-4 fill-primary" : "size-3.5 fill-primary"} />
      {value}
      <span className="text-muted-foreground font-medium">/10</span>
    </span>
  );
}

export function RatingPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`Rate ${n} out of 10`}
          className={cn(
            "h-11 w-11 rounded-xl border text-sm font-semibold transition-colors",
            value === n
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-secondary text-secondary-foreground hover:border-primary/60",
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
