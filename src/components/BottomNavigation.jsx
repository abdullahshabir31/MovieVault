import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clapperboard, Home, Search, User } from "lucide-react";

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/watched", label: "Watched", icon: CheckCircle2 },
  { to: "/watchlist", label: "Watchlist", icon: Clapperboard },
  { to: "/search", label: "Search", icon: Search },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNavigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border glass-panel safe-bottom md:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 pt-1.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:text-primary"
              activeProps={{ "aria-current": "page" }}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
