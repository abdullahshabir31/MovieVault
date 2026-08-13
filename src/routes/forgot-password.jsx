import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — MovieVault" },
      {
        name: "description",
        content: "Request a password reset link for your MovieVault account.",
      },
      { property: "og:title", content: "Reset your password — MovieVault" },
      { property: "og:description", content: "Request a password reset link for MovieVault." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setPending(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setPending(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <Link
          to="/auth"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          {sent ? (
            <div className="text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
                <MailCheck className="size-6" />
              </span>
              <h1 className="mt-4 text-xl font-semibold">Check your inbox</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                If an account exists for {email}, we've sent a link to reset your password.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold">Forgot your password?</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12"
                />
              </div>
              {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
              <Button type="submit" className="h-12 w-full text-base" disabled={pending}>
                {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Send reset link
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
