import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Manrope, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { COMPANY_NAME, SITE_DESCRIPTION, SITE_NAME, getSiteUrl } from "@/lib/site";
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
  metadataBase: getSiteUrl(),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: COMPANY_NAME }],
  creator: COMPANY_NAME,
  publisher: COMPANY_NAME,
  openGraph: { type: "website", locale: "tr_TR", siteName: SITE_NAME },
  twitter: { card: "summary_large_image" },
  // Uygulamanın içi giriş istiyor; dizine yalnızca tanıtım sayfası girsin
  // (app/page.tsx bunu kendi metadata'sında açıyor).
  robots: { index: false, follow: false },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1117" },
  ],
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
