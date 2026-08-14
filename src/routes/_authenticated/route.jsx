import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useNewSeasonAlerts } from "@/hooks/useNewSeasonAlerts";
import { useNewSequelAlerts } from "@/hooks/useNewSequelAlerts";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  // Runs once per session: nudges finished TV shows back to the watchlist
  // when a new season has aired since they were marked watched.
  useNewSeasonAlerts();
  // Runs once per session: adds newly-released sequels/franchise entries to
  // the watchlist for movies the person already watched.
  useNewSequelAlerts();
  return <Outlet />;
}
