import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clapperboard, Film, Loader2, Star, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FullPageLoader } from "@/components/LoadingState";
import { computeStats, useMovies } from "@/hooks/useMovies";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — MovieVault" },
      {
        name: "description",
        content: "Manage your MovieVault profile, avatar and see your personal movie statistics.",
      },
      { property: "og:title", content: "Your profile — MovieVault" },
      { property: "og:description", content: "Your MovieVault account and viewing statistics." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: movies } = useMovies();
  const stats = computeStats(movies);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile?.full_name]);

  useEffect(() => {
    let active = true;
    const path = profile?.avatar_url;
    if (!path) {
      setAvatarSrc(null);
      return () => {};
    }
    if (path.startsWith("http")) {
      setAvatarSrc(path);
      return () => {};
    }
    supabase.storage
      .from("avatars")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (active) setAvatarSrc(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [profile?.avatar_url]);

  const saveName = async (event) => {
    event.preventDefault();
    if (fullName.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Profile updated");
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(false);
      toast.error(uploadError.message);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", user.id);
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Profile picture updated");
  };

  if (isLoading) {
    return (
      <AppShell title="Profile">
        <FullPageLoader label="Loading your profile" />
      </AppShell>
    );
  }

  const created = profile?.created_at ? new Date(profile.created_at) : null;
  const initials = (profile?.full_name || user?.email || "?").slice(0, 2).toUpperCase();

  return (
    <AppShell title="Profile" subtitle="Your account and viewing stats.">
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
          <Avatar className="size-16">
            {avatarSrc ? <AvatarImage src={avatarSrc} alt="Your avatar" /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{profile?.full_name || "Movie lover"}</p>
            <p className="truncate text-sm text-muted-foreground">
              {profile?.email || user?.email}
            </p>
            {created ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Member since{" "}
                {created.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: Film, label: "Total movies", value: stats.total },
            { icon: CheckCircle2, label: "Watched", value: stats.watched },
            { icon: Clapperboard, label: "Watchlist", value: stats.watchlist },
            { icon: Star, label: "Avg rating", value: stats.average ? `${stats.average}/10` : "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="size-4" /> {label}
              </span>
              <p className="mt-2 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        <form
          onSubmit={saveName}
          className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card"
        >
          <h2 className="text-lg font-semibold">Edit profile</h2>
          <div className="space-y-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar">Profile picture</Label>
            <div className="flex items-center gap-3">
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                className="h-12 cursor-pointer"
              />
              {uploading ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="size-4 text-muted-foreground" />
              )}
            </div>
          </div>
          <Button type="submit" className="h-12 w-full sm:w-auto" disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
