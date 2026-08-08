"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signInWithPassword, signUpWithPassword } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/workspaces";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  const isLogin = mode === "login";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (isLogin) {
          await signInWithPassword(email, password);
        } else {
          await signUpWithPassword(email, password);
        }
        toast.success(isLogin ? "Giriş yapıldı" : "Kayıt tamamlandı");
        router.push(returnUrl);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Bir hata oluştu");
      }
    });
  }

  function onGoogleSignIn() {
    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("returnUrl", returnUrl);
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });
  }

  return (
    <Card className="shadow-lg shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-xl">{isLogin ? "Giriş Yap" : "Kayıt Ol"}</CardTitle>
        <CardDescription>
          {isLogin
            ? "Hesabınıza giriş yapın"
            : "Yeni bir hesap oluşturun"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@sirket.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isLogin ? "Giriş Yap" : "Kayıt Ol"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isPending}
            onClick={onGoogleSignIn}
          >
            Google ile devam et
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? (
              <>
                Hesabınız yok mu?{" "}
                <Link href={`/signup?returnUrl=${encodeURIComponent(returnUrl)}`} className="underline">
                  Kayıt olun
                </Link>
              </>
            ) : (
              <>
                Zaten hesabınız var mı?{" "}
                <Link href={`/login?returnUrl=${encodeURIComponent(returnUrl)}`} className="underline">
                  Giriş yapın
                </Link>
              </>
            )}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
