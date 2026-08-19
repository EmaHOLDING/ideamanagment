import { Columns3Icon, LightbulbIcon, SparklesIcon, UsersRoundIcon } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_30%),radial-gradient(circle_at_85%_80%,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_28%)]" />
      <div className="relative mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-10 px-4 py-8 md:grid-cols-[1.05fr_0.95fr] md:px-8">
        <section className="mx-auto flex max-w-xl flex-col items-center text-center md:items-start md:text-left">
          <div className="mb-8 flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><LightbulbIcon className="size-4.5" /></span>
            Fikir Kuluçkası
          </div>
          <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-primary uppercase">Fikirden etkiye</p>
          <h1 className="max-w-lg text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">Ekibinizin en iyi fikirlerini görünür hale getirin.</h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">Fikirleri tek yerde toplayın, birlikte değerlendirin ve doğru olanları ilerletin.</p>
          <div className="mt-8 hidden w-full grid-cols-3 gap-3 md:grid">
            {[{ icon: SparklesIcon, title: "Toplayın", text: "Fikirler kaybolmasın" }, { icon: UsersRoundIcon, title: "Birlikte", text: "Ekibinizle değerlendirin" }, { icon: Columns3Icon, title: "İlerletin", text: "Süreci panoda izleyin" }].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border bg-card/70 p-3 backdrop-blur-sm"><Icon className="mb-2 size-4 text-primary" /><p className="text-sm font-medium">{title}</p><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{text}</p></div>
            ))}
          </div>
        </section>
        <div className="mx-auto w-full max-w-sm md:justify-self-end">{children}</div>
      </div>
    </div>
  );
}
