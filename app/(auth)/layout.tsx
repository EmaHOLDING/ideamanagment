import Link from "next/link";
import { LightbulbIcon } from "lucide-react";

/** Giriş ekranı. Buraya genellikle davet linkiyle gelen ya da oturumu
 * düşen kullanıcı düşüyor; amaç tanıtmak değil, hızlıca giriş. Ürünü
 * anlatan sayfa kök adreste (bkz. components/landing/landing-page.tsx). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-[0.95rem] font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LightbulbIcon className="size-4" />
          </span>
          Fikir Kuluçkası
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
