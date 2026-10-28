/** Sitenin adı, şirketi ve kök adresi: metadata, robots, sitemap ve
 * manifest aynı değerleri buradan okuyor. */
export const SITE_NAME = "Fikir Kuluçkası";
export const COMPANY_NAME = "Ema Software";
export const SITE_TAGLINE = "Ekipler için fikir yönetimi";
export const SITE_DESCRIPTION =
  "Ekibinizin fikirlerini tek panoda toplayın, birlikte değerlendirin ve olgunlaşanları projeye dönüştürün. Her değişiklik versiyon geçmişinde kalır.";

/** Canlıda NEXT_PUBLIC_APP_URL (ör. https://alanadiniz.com) olmalı; yoksa
 * paylaşım görseli ve canonical adresler localhost'u gösterir. */
export function getSiteUrl() {
  return new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
}
