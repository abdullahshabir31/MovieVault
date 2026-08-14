import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Film, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setRememberMe } from "@/lib/auth-storage";
import { getPasswordError } from "@/lib/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/PasswordInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — MovieVault" },
      {
        name: "description",
        content:
          "Sign in or create your free MovieVault account to track watched movies and your watchlist.",
      },
      { property: "og:title", content: "Sign in — MovieVault" },
      { property: "og:description", content: "Access your private movie library on MovieVault." },
    ],
  }),
  component: AuthPage,
});

function GoogleButton({ label }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      className="h-12 w-full"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) {
          setPending(false);
          toast.error(error.message || "Google sign-in failed.");
        }
        // On success Supabase redirects the browser to Google automatically.
      }}
    >
      {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setPending(true);
    setRememberMe(remember);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setPending(false);
    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "That email and password combination doesn't match an account."
          : signInError.message,
      );
      return;
    }
    toast.success("Welcome back");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} />
          Remember me
        </label>
        <Link to="/forgot-password" className="text-sm font-medium text-primary">
          Forgot password?
        </Link>
      </div>

      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

      <Button type="submit" className="h-12 w-full text-base" disabled={pending}>
        {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Sign in
      </Button>
      <GoogleButton label="Continue with Google" />
    </form>
  );
}

const RESEND_COOLDOWN_SECONDS = 30;

function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (fullName.trim().length < 2) return setError("Please enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError("Enter a valid email address.");
    const passwordError = getPasswordError(password);
    if (passwordError) return setError(passwordError);
    if (password !== confirm) return setError("Passwords don't match.");

    setPending(true);
    setRememberMe(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName.trim() },
      },
    });
    setPending(false);
    if (signUpError) {
      setError(
        signUpError.message.includes("already registered")
          ? "An account with this email already exists. Try signing in."
          : signUpError.message,
      );
      return;
    }
    setSent(true);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setResending(false);
    if (resendError) {
      toast.error(resendError.message || "Couldn't resend the email.");
      return;
    }
    toast.success("Confirmation email resent.");
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5 text-center">
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a confirmation link to{" "}
          <span className="font-medium text-foreground">{email}</span>. Confirm it to activate your
          vault, then sign in.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4 h-11 w-full"
          disabled={cooldown > 0 || resending}
          onClick={resend}
        >
          {resending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {cooldown > 0 ? `Resend email (${cooldown}s)` : "Resend email"}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className="h-12"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="register-password">Password</Label>
        <PasswordInput
          id="register-password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm password</Label>
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </div>

      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

      <Button type="submit" className="h-12 w-full text-base" disabled={pending}>
        {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Create account
      </Button>
      <GoogleButton label="Sign up with Google" />
    </form>
  );
}

function AuthPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Film className="size-6" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">MovieVault</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your private movie library, always in your pocket.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
          <Tabs defaultValue="login">
            <TabsList className="mb-5 grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/">Back to home</Link>
        </p>
      </div>
    </div>
  );
}
