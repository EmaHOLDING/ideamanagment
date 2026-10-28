"use client";

import { useEffect, useState } from "react";
import { LightbulbIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoogleSignInButton } from "./google-sign-in-button";

const LINKS = [
  { href: "#nasil-isliyor", label: "Nasıl işliyor" },
  { href: "#versiyonlar", label: "Versiyonlar" },
  { href: "#ozellikler", label: "Özellikler" },
];

/** Sayfanın üstüne yapışan başlık; sayfa kaydırılınca zemin ve çizgi alır. */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,border-color] duration-300",
        scrolled ? "border-border bg-background/80 backdrop-blur-md" : "border-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <a href="#" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LightbulbIcon className="size-4" />
          </span>
          <span className="leading-tight">
            <span className="block text-[0.95rem] font-semibold">Fikir Kuluçkası</span>
            <span className="block text-[11px] text-muted-foreground">Ema Software</span>
          </span>
        </a>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>
        <GoogleSignInButton label="Giriş yap" size="sm" variant="outline" />
      </div>
    </header>
  );
}
