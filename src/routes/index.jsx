import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Film, ListPlus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MovieVault — Never watch the same movie twice" },
      {
        name: "description",
        content:
          "Search a movie and instantly know if you already watched it. Rate films 1–10, keep private notes and build a watchlist — free and mobile-first.",
      },
      { property: "og:title", content: "MovieVault — Never watch the same movie twice" },
      {
        property: "og:description",
        content:
          "Instantly check if you already watched a movie, rate it, and keep a private watchlist.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Search,
    title: "Instant already-watched check",
    text: "Search any title before you press play and see your history in a tap.",
  },
  {
    icon: CheckCircle2,
    title: "Rate and remember",
    text: "Score films out of 10 and keep private notes on what you loved.",
  },
  {
    icon: ListPlus,
    title: "A watchlist that travels",
    text: "Save movies for later and install MovieVault on your phone home screen.",
  },
];

function Landing() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Film className="size-4" />
          </span>
          <span className="font-display tracking-tight">MovieVault</span>
        </div>
        {loading ? null : user ? (
          <Button asChild size="sm" className="h-10">
            <Link to="/dashboard">Open app</Link>
          </Button>
        ) : (
          <Button asChild variant="ghost" size="sm" className="h-10">
            <Link to="/auth">Sign in</Link>
          </Button>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="pt-8 md:pt-16">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
            <Sparkles className="size-3.5" /> Your personal movie memory
          </span>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Never watch the same movie twice.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
            Downloaded something and can't remember if you've seen it? Search it in MovieVault and
            find out in a second — then rate it, note it, and keep your watchlist ready.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-13 px-6 text-base">
              <Link
                to={user ? "/dashboard" : "/auth"}
                search={user ? undefined : { mode: "register" }}
              >
                {user ? "Go to dashboard" : "Create your free vault"}
              </Link>
            </Button>
            {user ? null : (
              <Button asChild variant="secondary" className="h-13 px-6 text-base">
                <Link to="/auth" search={{ mode: "login" }}>
                  I already have an account
                </Link>
              </Button>
            )}
          </div>
        </section>

        <section className="mt-14 grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
