import { useEffect, useMemo, useState } from "react";
import { Download, Monitor, Smartphone, Share2, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const PWA_PROMPT_DISMISS_KEY = "expense-tracker-pwa-dismissed-at";
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function isStandaloneMode() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // Safari/iOS standalone flag
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const isIOS = useMemo(
    () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/CriOS|FxiOS/i.test(navigator.userAgent),
    [],
  );
  const isMobile = useMemo(() => window.matchMedia?.("(max-width: 768px)").matches ?? false, []);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());
  }, []);

  useEffect(() => {
    if (isInstalled) return;

    const dismissedAt = Number(localStorage.getItem(PWA_PROMPT_DISMISS_KEY) || "0");
    if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari has no beforeinstallprompt event; show manual install hint.
    if (isIOS && !isStandaloneMode()) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [isInstalled, isIOS]);

  const dismiss = () => {
    localStorage.setItem(PWA_PROMPT_DISMISS_KEY, String(Date.now()));
    setShowPrompt(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <div className="fixed z-50 bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] sm:w-auto sm:min-w-[360px] max-w-[540px]">
      <div className="bg-card border border-border rounded-2xl shadow-2xl backdrop-blur-md p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
              Install App
            </p>
            <h4 className="font-black text-foreground text-sm sm:text-base">
              Install SpendWise for faster access
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Use as full-screen app, better performance, and quick home-screen launch.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">
          {deferredPrompt ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={install}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Install Now
              </button>
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                {isMobile ? <Smartphone className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
                {isMobile ? "Mobile-ready experience" : "Desktop app mode supported"}
              </span>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground font-medium leading-relaxed bg-accent/20 border border-border rounded-xl p-3">
              <span className="font-black text-foreground">iPhone/iPad:</span> Tap <Share2 className="inline h-3.5 w-3.5" />{" "}
              then choose <span className="font-black text-foreground">Add to Home Screen</span>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
