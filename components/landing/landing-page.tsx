import { ArrowDownIcon, FileDownIcon, FileUpIcon, LightbulbIcon, Link2Icon, UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoogleSignInButton } from "./google-sign-in-button";
import { SiteHeader } from "./site-header";
import { Shot } from "./shot";
import { Reveal } from "./reveal";
import { FlowDemo } from "./flow-demo";
import { VersionDemo } from "./version-demo";
import { FeatureTabs } from "./feature-tabs";
import styles from "./landing.module.css";

import panoLight from "@/public/landing/pano-light.webp";
import panoDark from "@/public/landing/pano-dark.webp";

const HEADLINE = "Ekibinizin fikirleri tek panoda, ilk nottan projeye kadar.";

const EXTRAS = [
  { icon: UsersIcon, title: "Roller", text: "Sahip, yönetici, üye ve izleyici; herkes yetkisi kadarını görür." },
  { icon: Link2Icon, title: "Davet linki", text: "Ekip arkadaşlarınız tek bir linkle çalışma alanına katılır." },
  { icon: FileDownIcon, title: "Dışarı aktarma", text: "Panoyu PNG ya da PDF olarak paylaşın." },
  { icon: FileUpIcon, title: "İçe aktarma", text: "Elinizdeki fikirleri Markdown dosyasından tek seferde alın." },
];

function delay(ms: number) {
  return { "--d": `${ms}ms` } as React.CSSProperties;
}

function SectionHeading({ label, title, text }: { label: string; title: string; text?: string }) {
  return (
    <Reveal className="max-w-2xl">
      <p className="text-sm font-medium text-primary">{label}</p>
      <h2 className="mt-2 text-[1.75rem] leading-tight font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{text}</p>}
    </Reveal>
  );
}

export function LandingPage() {
  return (
    <div className={cn("min-h-dvh bg-background text-foreground", styles.page)}>
      <SiteHeader />

      <main>
        {/* Açılış */}
        <section className="relative -mt-16 overflow-hidden pt-16">
          <div className={cn("pointer-events-none absolute inset-0 opacity-70", styles.grid)} aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-24">
            <p
              className={cn("flex items-center gap-2 text-sm text-muted-foreground", styles.rise)}
              style={delay(0)}
            >
              <span className="size-1.5 rounded-full bg-primary" />
              Ema Software · Ekipler için fikir yönetimi
            </p>
            <h1 className="mt-5 max-w-4xl text-[2.35rem] leading-[1.08] font-semibold tracking-tight sm:text-6xl">
              {HEADLINE.split(" ").map((word, i) => (
                <span key={i}>
                  <span className={styles.word}>
                    <span style={delay(80 + i * 55)}>{word}</span>
                  </span>{" "}
                </span>
              ))}
            </h1>
            <p
              className={cn("mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground", styles.rise)}
              style={delay(450)}
            >
              Fikir Kuluçkası; fikirleri toplamak, birlikte değerlendirmek ve olgunlaşanları projeye
              dönüştürmek için bir çalışma alanı. Kimin neyi önerdiği, fikrin nasıl değiştiği ve hangi
              kararın neden alındığı aynı yerde kalır.
            </p>
            <div className={cn("mt-9 flex flex-wrap items-center gap-3", styles.rise)} style={delay(580)}>
              <GoogleSignInButton />
              <a
                href="#nasil-isliyor"
                className="inline-flex h-11 items-center gap-2 rounded-lg px-4 text-[0.9rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Nasıl işlediğini görün
                <ArrowDownIcon className="size-4" />
              </a>
            </div>

            <div className={cn("mt-14 sm:mt-20", styles.rise)} style={delay(700)}>
              <div className={styles.tilt}>
                <Shot
                  chrome
                  light={panoLight}
                  dark={panoDark}
                  alt="Fikir panosu: Taslak, İncelemede, Onaylandı ve Tamamlandı kolonlarında etiketli, oylanmış ve projelere bağlı fikir kartları."
                  sizes="(min-width: 1200px) 1152px, 100vw"
                  eager
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Nasıl işliyor */}
          <section id="nasil-isliyor" className="scroll-mt-20 py-24 sm:py-32">
            <SectionHeading
              label="Nasıl işliyor"
              title="Bir fikrin panodan projeye yolculuğu"
              text="Fikirler kolonlar arasında ilerler; her aşamada ekip aynı kartın etrafında buluşur."
            />
            <Reveal className="mt-12 sm:mt-16" delay={100}>
              <FlowDemo />
            </Reveal>
          </section>

          {/* Versiyon geçmişi */}
          <section
            id="versiyonlar"
            className="grid scroll-mt-20 items-center gap-12 border-t py-24 sm:py-32 lg:grid-cols-[5fr_6fr] lg:gap-16"
          >
            <div>
              <SectionHeading label="Versiyon geçmişi" title="Bir fikrin nasıl olgunlaştığı kaybolmaz" />
              <Reveal delay={100} className="mt-5 space-y-5 leading-relaxed text-muted-foreground">
                <p>
                  Fikirler ilk halleriyle kalmaz. Biri problemi netleştirir, bir başkası kapsamı daraltır,
                  etki ve efor yeniden değerlendirilir. Her düzenleme yeni bir versiyon olarak saklanır;
                  eskisinin üzerine yazılmaz.
                </p>
                <ul className="space-y-2.5 border-l pl-4">
                  <li>Kimin neyi ne zaman değiştirdiği, versiyonlar yan yana dizilerek görünür.</li>
                  <li>Hangi alanın değiştiği her versiyonda işaretlidir.</li>
                  <li>Bir kararın hangi düşünceden çıktığı sonradan da izlenebilir.</li>
                </ul>
                <p>Yanlışlıkla silinen bir şey hemen geri alınır; biten fikirler silinmez, arşivlenir.</p>
              </Reveal>
            </div>
            <Reveal delay={150}>
              <VersionDemo />
            </Reveal>
          </section>

          {/* Özellikler */}
          <section id="ozellikler" className="scroll-mt-20 border-t py-24 sm:py-32">
            <SectionHeading
              label="Özellikler"
              title="Fikirden karara giden her şey tek çalışma alanında"
            />
            <Reveal className="mt-12 sm:mt-16" delay={100}>
              <FeatureTabs />
            </Reveal>
          </section>

          {/* Ayrıca */}
          <section className="border-t py-16 sm:py-20">
            <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {EXTRAS.map((item, i) => (
                <li key={item.title}>
                  <Reveal delay={i * 90}>
                    <item.icon className="size-5 text-primary" strokeWidth={1.75} />
                    <h3 className="mt-4 font-semibold">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                  </Reveal>
                </li>
              ))}
            </ul>
          </section>

          {/* Kapanış */}
          <section className="pb-24 sm:pb-32">
            <Reveal className="relative overflow-hidden rounded-2xl border bg-muted/30 px-6 py-14 sm:px-14 sm:py-20">
              <div className={cn("pointer-events-none absolute inset-0 opacity-60", styles.grid)} aria-hidden />
              <div className="relative max-w-xl">
                <h2 className="text-[1.75rem] leading-tight font-semibold tracking-tight sm:text-4xl">
                  İlk panonuzu kurmak birkaç dakika sürer.
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                  Hazır bir şablon seçin, ekibinizi davet linkiyle çağırın ve ilk fikri ekleyin.
                </p>
                <div className="mt-8">
                  <GoogleSignInButton />
                </div>
              </div>
            </Reveal>
          </section>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LightbulbIcon className="size-3" />
            </span>
            <span>
              <span className="font-medium text-foreground">Fikir Kuluçkası</span> bir Ema Software ürünüdür.
            </span>
          </div>
          <span>© {new Date().getFullYear()} Ema Software</span>
        </div>
      </footer>
    </div>
  );
}
