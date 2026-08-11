"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LockIcon } from "lucide-react";
import type { Provider } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] shrink-0">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.48a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.88-3a7.15 7.15 0 0 1-10.64-3.76H1.4v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.41 14.33a7.2 7.2 0 0 1 0-4.66V6.58H1.4a12 12 0 0 0 0 10.84l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.4 6.58l4.01 3.09A7.15 7.15 0 0 1 12 4.77Z"
      />
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] shrink-0">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

function LinkedInLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" fill="#0A66C2">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
    </svg>
  );
}

function GitHubLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] shrink-0 text-foreground" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.5 0 12.3c0 5.44 3.44 10.05 8.21 11.68.6.12.82-.27.82-.6 0-.3-.01-1.08-.02-2.12-3.34.75-4.04-1.64-4.04-1.64-.55-1.44-1.34-1.82-1.34-1.82-1.1-.77.08-.76.08-.76 1.21.09 1.85 1.27 1.85 1.27 1.08 1.9 2.82 1.35 3.51 1.03.11-.8.42-1.35.76-1.66-2.66-.3-5.47-1.36-5.47-6.06 0-1.34.46-2.43 1.23-3.29-.12-.31-.53-1.56.12-3.25 0 0 1-.33 3.3 1.25a11.3 11.3 0 0 1 6 0c2.3-1.58 3.3-1.25 3.3-1.25.65 1.69.24 2.94.12 3.25.77.86 1.23 1.95 1.23 3.29 0 4.71-2.81 5.75-5.49 6.05.43.38.81 1.12.81 2.27 0 1.64-.01 2.96-.01 3.36 0 .33.22.72.83.6C20.57 22.34 24 17.74 24 12.3 24 5.5 18.63 0 12 0Z" />
    </svg>
  );
}

function GitLabLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] shrink-0">
      <path fill="#E24329" d="m12 21.94 4.24-13.05H7.76L12 21.94Z" />
      <path fill="#FC6D26" d="M12 21.94 7.76 8.89H1.5L12 21.94Z" />
      <path fill="#FCA326" d="M1.5 8.89.31 12.6a1 1 0 0 0 .36 1.11L12 21.94 1.5 8.89Z" />
      <path fill="#E24329" d="M1.5 8.89h6.26L5.03 1.15a.5.5 0 0 0-.95 0L1.5 8.89Z" />
      <path fill="#FC6D26" d="M12 21.94 16.24 8.89H22.5L12 21.94Z" />
      <path fill="#FCA326" d="M22.5 8.89 23.69 12.6a1 1 0 0 1-.36 1.11L12 21.94 22.5 8.89Z" />
      <path fill="#E24329" d="M22.5 8.89h-6.26l2.73-7.74a.5.5 0 0 1 .95 0l2.58 7.74Z" />
    </svg>
  );
}

// Microsoft/LinkedIn/GitHub/GitLab için OAuth uygulama kaydı henüz
// tamamlanmadığı için (bkz. OAUTH_KURULUM.md) bu sağlayıcılar şimdilik
// gizli — key'ler girilip test edildiğinde `visible: true` yapmak yeterli.
const OAUTH_PROVIDERS: {
  provider: Provider;
  label: string;
  icon: React.ReactNode;
  visible: boolean;
}[] = [
  { provider: "google", label: "Google ile devam et", icon: <GoogleLogo />, visible: true },
  { provider: "azure", label: "Microsoft ile devam et", icon: <MicrosoftLogo />, visible: false },
  {
    provider: "linkedin_oidc",
    label: "LinkedIn ile devam et",
    icon: <LinkedInLogo />,
    visible: false,
  },
  { provider: "github", label: "GitHub ile devam et", icon: <GitHubLogo />, visible: false },
  { provider: "gitlab", label: "GitLab ile devam et", icon: <GitLabLogo />, visible: false },
];

export function AuthForm() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/workspaces";
  const [pendingProvider, setPendingProvider] = useState<Provider | null>(null);

  // OAuth sağlayıcısına yönlendirdikten sonra kullanıcı tarayıcının "geri"
  // tuşuyla bu sayfaya dönerse, sayfa bfcache'ten (JS state'i dondurulmuş
  // haliyle) geri gelebiliyor — pendingProvider hâlâ dolu kaldığı için tüm
  // butonlar kalıcı olarak devre dışı görünüyordu. pageshow + persisted
  // bunu tespit edip state'i sıfırlıyor.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) setPendingProvider(null);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  function onOAuthSignIn(provider: Provider) {
    setPendingProvider(provider);
    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("returnUrl", returnUrl);
    supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl.toString() },
    });
  }

  return (
    <Card className="shadow-lg shadow-primary/10">
      <CardHeader className="items-center text-center">
        <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LockIcon className="size-4.5" />
        </div>
        <CardTitle className="text-xl">Giriş Yap</CardTitle>
        <CardDescription>Devam etmek için bir hesapla giriş yapın</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {OAUTH_PROVIDERS.filter((p) => p.visible).map(({ provider, label, icon }) => (
          <Button
            key={provider}
            type="button"
            variant="outline"
            size="lg"
            className="h-11 w-full justify-start gap-3 px-4 text-[0.9rem] font-normal"
            disabled={pendingProvider !== null}
            onClick={() => onOAuthSignIn(provider)}
          >
            {icon}
            {label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
