import type { Metadata } from "next";
import { headers } from "next/headers";
import { Manrope, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fikir Kuluçkası",
  description: "Girişim fikir kuluçkası ve yönetim platformu",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // CSP nonce'ı proxy.ts'te üretilip istek başlığına yazılıyor; satır içi
  // script basan tek bileşenimiz (next-themes) buna ihtiyaç duyuyor.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider nonce={nonce}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
