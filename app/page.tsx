import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Fikir Kuluçkası — Ema Software",
  description:
    "Ema Software'den Fikir Kuluçkası: fikirleri toplamak, birlikte değerlendirmek ve olgunlaşanları projeye dönüştürmek için ekip çalışma alanı. Her düzenleme versiyon geçmişinde saklanır.",
};

/** Giriş yapmamış ziyaretçiye tanıtım sayfası; giriş yapmış kullanıcı
 * eskisi gibi doğrudan workspace'lerine gider. */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/workspaces");

  return <LandingPage />;
}
