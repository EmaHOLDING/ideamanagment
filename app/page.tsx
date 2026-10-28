import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/landing/landing-page";
import { COMPANY_NAME, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, getSiteUrl } from "@/lib/site";

const TITLE = `${SITE_NAME} — ${SITE_TAGLINE} | ${COMPANY_NAME}`;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: SITE_DESCRIPTION,
  keywords: [
    "fikir yönetimi",
    "fikir panosu",
    "ekip fikir yönetimi",
    "inovasyon yönetimi",
    "fikir versiyonlama",
    "ürün fikirleri",
    "kanban fikir panosu",
    COMPANY_NAME,
  ],
  alternates: { canonical: "/" },
  // Kök layout her şeyi noindex yapıyor; tanıtım sayfası istisna.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: SITE_NAME,
    url: "/",
    title: TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: SITE_DESCRIPTION },
};

/** Arama motorları için ürün ve şirket bilgisi (schema.org). */
function structuredData() {
  const url = getSiteUrl().href;
  const organization = { "@type": "Organization", "@id": `${url}#organization`, name: COMPANY_NAME };
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      {
        "@type": "WebSite",
        "@id": `${url}#website`,
        url,
        name: SITE_NAME,
        inLanguage: "tr-TR",
        publisher: { "@id": organization["@id"] },
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        url,
        description: SITE_DESCRIPTION,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "tr-TR",
        publisher: { "@id": organization["@id"] },
      },
    ],
  };
}

/** Giriş yapmamış ziyaretçiye tanıtım sayfası; giriş yapmış kullanıcı
 * eskisi gibi doğrudan workspace'lerine gider. */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/workspaces");

  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        // JSON içinde "</script>" kapanışı oluşamasın.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()).replace(/</g, "\\u003c") }}
      />
      <LandingPage />
    </>
  );
}
