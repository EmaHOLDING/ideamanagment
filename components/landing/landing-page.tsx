import Image, { type StaticImageData } from "next/image";
import { LightbulbIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoogleSignInButton } from "./google-sign-in-button";

import panoLight from "@/public/landing/pano-light.webp";
import panoDark from "@/public/landing/pano-dark.webp";
import projeLight from "@/public/landing/proje-light.webp";
import projeDark from "@/public/landing/proje-dark.webp";
import versiyonLight from "@/public/landing/versiyon-light.webp";
import versiyonDark from "@/public/landing/versiyon-dark.webp";
import birlikteLight from "@/public/landing/birlikte-light.webp";
import birlikteDark from "@/public/landing/birlikte-dark.webp";
import genelBakisLight from "@/public/landing/genel-bakis-light.webp";
import genelBakisDark from "@/public/landing/genel-bakis-dark.webp";

/** Ürünün gerçek ekran görüntüsü; sayfa hangi temadaysa o temanın
 * görüntüsü gösteriliyor (tema next-themes ile <html>'e sınıf olarak
 * yazıldığı için `dark:` varyantları doğrudan çalışıyor). */
function Shot({
  light,
  dark,
  alt,
  sizes,
  eager = false,
  className,
}: {
  light: StaticImageData;
  dark: StaticImageData;
  alt: string;
  sizes: string;
  eager?: boolean;
  className?: string;
}) {
  const loading = eager ? "eager" : "lazy";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.05),0_16px_40px_-20px_rgb(0_0_0/0.25)]",
        className
      )}
    >
      <Image
        src={light}
        alt={alt}
        sizes={sizes}
        loading={loading}
        fetchPriority={eager ? "high" : undefined}
        className="block h-auto w-full dark:hidden"
      />
      <Image
        src={dark}
        alt={alt}
        sizes={sizes}
        loading={loading}
        className="hidden h-auto w-full dark:block"
      />
    </div>
  );
}

const STEPS = [
  {
    title: "Topla",
    text: "Herkes fikrini panoya ekler. Başlık yeterli; problem, hedef kitle, etki ve efor sonradan tamamlanabilir.",
  },
  {
    title: "Değerlendir",
    text: "Ekip yorum yapar, oy verir, sorumlu atar. Fikir kolonlar arasında aşama aşama ilerler.",
  },
  {
    title: "Projeye dönüştür",
    text: "Olgunlaşan fikir projeye dönüşür; sonraki fikirler o projenin özellikleri olarak gelişir.",
  },
];

const FEATURE_SIZES = "(min-width: 1024px) 680px, 100vw";

function Feature({
  label,
  title,
  children,
  shot,
  reverse = false,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
  shot: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <section
      className={cn(
        "grid items-center gap-8 border-t py-16 sm:py-20 lg:gap-14",
        // Görsel her iki yönde de geniş sütunda kalsın.
        reverse ? "lg:grid-cols-[7fr_5fr]" : "lg:grid-cols-[5fr_7fr]"
      )}
    >
      <div className={cn("max-w-md", reverse && "lg:order-2")}>
        <p className="text-sm font-medium text-primary">{label}</p>
        <h2 className="mt-2 text-2xl leading-snug font-semibold tracking-tight sm:text-[1.7rem]">{title}</h2>
        <div className="mt-4 space-y-4 leading-relaxed text-muted-foreground">{children}</div>
      </div>
      <div className={cn(reverse && "lg:order-1")}>{shot}</div>
    </section>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5 text-[0.95rem] font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LightbulbIcon className="size-4" />
            </span>
            Fikir Kuluçkası
          </div>
          <GoogleSignInButton label="Giriş yap" size="sm" variant="outline" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="pt-14 pb-12 sm:pt-20">
          <h1 className="max-w-3xl text-[2.1rem] leading-[1.15] font-semibold tracking-tight sm:text-5xl">
            Ekibinizin fikirleri tek panoda, ilk nottan projeye kadar.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Fikir Kuluçkası; fikirleri toplamak, birlikte değerlendirmek ve olgunlaşanları projeye
            dönüştürmek için bir çalışma alanı. Kimin neyi önerdiği, fikrin nasıl değiştiği ve hangi
            kararın neden alındığı aynı yerde kalır.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
            <GoogleSignInButton />
            <span className="text-sm text-muted-foreground">Google hesabınızla giriş yapılır.</span>
          </div>
        </section>

        <Shot
          light={panoLight}
          dark={panoDark}
          alt="Fikir panosu: Taslak, İncelemede, Onaylandı ve Tamamlandı kolonlarında etiketli, oylanmış ve projelere bağlı fikir kartları."
          sizes="(min-width: 1200px) 1152px, 100vw"
          eager
        />

        <section className="mt-20 border-t py-16 sm:mt-24 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight">Nasıl işliyor</h2>
          <ol className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="font-mono text-sm text-muted-foreground tabular-nums">0{i + 1}</span>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <Feature
          label="Projeler"
          title="Olgunlaşan fikir, bir projenin başlangıcı olur"
          shot={
            <Shot
              light={projeLight}
              dark={projeDark}
              alt="Proje sayfası: açıklama, ana problem tanımı, hedef kitle ve projeye bağlı fikirlerin listesi."
              sizes={FEATURE_SIZES}
            />
          }
        >
          <p>
            Yeterince olgunlaşan bir fikri tek adımda projeye çevirirsiniz. Fikir panoda kalır ve
            projenin çıkış fikri olarak işaretlenir; problem tanımı ve hedef kitle projeye taşınır.
          </p>
          <p>
            Sonraki fikirleri o projeye bağlayarak özelliklerini aynı yerde geliştirirsiniz. Bir
            workspace içinde hem yeni girişim fikirleri hem de mevcut projelere özellik fikirleri yan
            yana yürür.
          </p>
        </Feature>

        <Feature
          reverse
          label="Versiyon geçmişi"
          title="Bir fikrin nasıl olgunlaştığı kaybolmaz"
          shot={
            <Shot
              light={versiyonLight}
              dark={versiyonDark}
              alt="Versiyon geçmişi: aynı fikrin üç versiyonu yan yana; her birinde düzenleyen kişi, tarih ve değişen alanlar."
              sizes={FEATURE_SIZES}
            />
          }
        >
          <p>
            Fikirler ilk halleriyle kalmaz. Biri problemi netleştirir, bir başkası kapsamı daraltır,
            etki ve efor yeniden değerlendirilir. Her düzenleme yeni bir versiyon olarak saklanır;
            eskisinin üzerine yazılmaz.
          </p>
          <ul className="space-y-2.5 border-l pl-4">
            <li>Kimin neyi ne zaman değiştirdiği, versiyonlar yan yana dizilerek görünür.</li>
            <li>Hangi alanın değiştiği (başlık, problem, etki…) her versiyonda işaretlidir.</li>
            <li>Bir kararın hangi düşünceden çıktığı sonradan da izlenebilir.</li>
          </ul>
          <p>
            Yanlışlıkla silinen bir şey hemen geri alınabilir; biten fikirler silinmek yerine
            arşivlenir.
          </p>
        </Feature>

        <Feature
          label="Ekip çalışması"
          title="Tartışma, fikrin hemen yanında"
          shot={
            <Shot
              light={birlikteLight}
              dark={birlikteDark}
              alt="Fikir detayı: solda @ ile ekip arkadaşının etiketlendiği yorumlar, sağda problem tanımı, hedef kitle ve içerik."
              sizes={FEATURE_SIZES}
            />
          }
        >
          <p>
            Yorumlar fikrin içinde durur. @ ile ekip arkadaşınızı çağırdığınızda ona bildirim gider;
            sohbet başka bir uygulamada kaybolmaz.
          </p>
          <p>
            Biri bir kartı düzenliyor ya da taşıyorsa adı kartın üzerinde görünür ve aynı kartı iki
            kişi aynı anda taşıyamaz. Aktivite akışı, ekipte olan biteni sırasıyla gösterir.
          </p>
        </Feature>

        <Feature
          reverse
          label="Genel bakış"
          title="Karar bekleyeni gözden kaçırmayın"
          shot={
            <Shot
              light={genelBakisLight}
              dark={genelBakisDark}
              alt="Genel bakış: aktif, incelemedeki, atanmamış ve uzun süredir bekleyen fikir sayıları; kolon dağılımı ve dikkat gerektiren fikirler."
              sizes={FEATURE_SIZES}
            />
          }
        >
          <p>
            İncelemede bekleyen, sorumlusu olmayan ve bir haftadır dokunulmamış fikirler ayrı bir
            listede toplanır. Hangi aşamada yığılma olduğu tek bakışta görünür.
          </p>
          <p>
            Etki ve efor değerlendirmesi ile ekibin oyları, hangi fikrin öne alınacağına birlikte karar
            vermeyi kolaylaştırır.
          </p>
        </Feature>

        <section className="border-t py-10">
          <p className="max-w-3xl leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Ayrıca:</span> sahip, yönetici, üye ve
            izleyici rolleri · davet linkiyle katılım · panoyu PNG ya da PDF olarak dışarı aktarma ·
            Markdown dosyasından fikir içe aktarma.
          </p>
        </section>

        <section className="border-t py-16 sm:py-24">
          <h2 className="max-w-xl text-2xl leading-snug font-semibold tracking-tight sm:text-3xl">
            İlk panonuzu kurmak birkaç dakika sürer.
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
            Hazır bir şablon seçin, ekibinizi davet linkiyle çağırın ve ilk fikri ekleyin.
          </p>
          <div className="mt-8">
            <GoogleSignInButton />
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <span>Fikir Kuluçkası</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
