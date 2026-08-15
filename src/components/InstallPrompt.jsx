import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "movievault:install-prompt-dismissed";
const SHOW_DELAY_MS = 3500;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!deferredPrompt) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [deferredPrompt]);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
    sessionStorage.setItem(DISMISS_KEY, "1");
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-prompt-title"
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl animate-in fade-in zoom-in-95">
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <span className="mx-auto grid size-16 place-items-center overflow-hidden rounded-full bg-primary shadow-lg">
          <img src="/icons/icon-192.png" alt="MovieVault" className="size-full object-cover" />
        </span>

        <h2
          id="install-prompt-title"
          className="mt-4 font-display text-lg font-semibold tracking-tight text-foreground"
        >
          Get the MovieVault App
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Install MovieVault on your device for instant access to your movie library, right from
          your home screen.
        </p>

        <div className="mt-5 flex items-center justify-center gap-3">
          <Button onClick={install} size="lg" className="gap-2 px-6">
            <Download className="size-4" />
            Install Now
          </Button>
          <Button onClick={dismiss} variant="ghost" size="lg">
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
}
