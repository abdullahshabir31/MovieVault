import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getPasswordError } from "@/lib/password";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — MovieVault" },
      { name: "description", content: "Choose a new password for your MovieVault account." },
      { property: "og:title", content: "Set a new password — MovieVault" },
      { property: "og:description", content: "Choose a new password for your MovieVault account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session) || isRecovery);
    });
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const passwordError = getPasswordError(password);
    if (passwordError) return setError(passwordError);
    if (password !== confirm) return setError("Passwords don't match.");
    setPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    toast.success("Password updated successfully");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-card">
        <span className="grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <KeyRound className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-semibold">Set a new password</h1>

        {!ready ? (
          <p className="mt-3 text-sm text-muted-foreground">
            This reset link is invalid or has expired.{" "}
            <Link to="/forgot-password" className="font-medium text-primary">
              Request a new one
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <PasswordInput
                id="confirm-new-password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </div>
            {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
            <Button type="submit" className="h-12 w-full text-base" disabled={pending}>
              {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
