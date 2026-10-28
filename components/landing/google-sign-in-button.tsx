"use client";

import { useEffect, useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleLogo } from "@/components/auth/auth-form";
import { startOAuthSignIn } from "@/lib/auth/oauth";
import { cn } from "@/lib/utils";

/** Tanıtım sayfasındaki giriş butonu. Giriş zaten yalnızca Google ile
 * yapıldığı için ayrı bir giriş formuna gerek yok: buton doğrudan Google'a
 * yönlendiriyor. */
export function GoogleSignInButton({
  label = "Google ile başla",
  size = "lg",
  variant = "default",
  className,
}: {
  label?: string;
  size?: "sm" | "lg";
  variant?: "default" | "outline";
  className?: string;
}) {
  const [pending, setPending] = useState(false);

  // Google'a gidip tarayıcının "geri" tuşuyla dönülürse sayfa bfcache'ten
  // donmuş haliyle gelebiliyor; buton "yükleniyor"da takılı kalmasın.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) setPending(false);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={pending}
      onClick={() => {
        setPending(true);
        startOAuthSignIn("google");
      }}
      className={cn(size === "lg" && "h-11 gap-2.5 px-5 text-[0.9rem]", className)}
    >
      {pending ? (
        <LoaderCircleIcon className="animate-spin" />
      ) : (
        // Birincil (dolu) butonda Google logosu beyaz bir rozet içinde, ki
        // renkleri arka planda kaybolmasın.
        <span className={cn("flex items-center justify-center", variant === "default" && "rounded-full bg-white p-0.5")}>
          <GoogleLogo />
        </span>
      )}
      {label}
    </Button>
  );
}
