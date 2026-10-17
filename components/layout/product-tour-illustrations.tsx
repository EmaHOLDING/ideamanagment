import {
  ActivityIcon,
  ArchiveIcon,
  ArrowRightIcon,
  AtSignIcon,
  BellIcon,
  ChartNoAxesCombinedIcon,
  CheckIcon,
  EyeIcon,
  FileTextIcon,
  FolderKanbanIcon,
  GripVerticalIcon,
  HistoryIcon,
  ImageIcon,
  LightbulbIcon,
  MessageCircleIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SproutIcon,
  TagIcon,
  ThumbsUpIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TourIllustration } from "@/lib/tour-steps";

/** Turdaki her adımın üst görseli. Ekran görüntüsü yerine uygulamanın
 * kendi yapı taşlarından (kart, rozet, ikon) kurulmuş küçük sahneler:
 * tema renklerini kendiliğinden alıyor, arayüz değiştiğinde de
 * bayatlamıyor. Tamamı dekoratif — anlam, adımın başlık ve metninde. */
export function TourIllustrationScene({ name }: { name: TourIllustration }) {
  const Scene = SCENES[name];
  return (
    <div
      aria-hidden
      className="relative flex h-44 items-center justify-center overflow-hidden border-b bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_60%),radial-gradient(circle_at_80%_90%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_55%)] sm:h-48"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--foreground)_5%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground)_5%,transparent)_1px,transparent_1px)] bg-[size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]" />
      <div className="relative sm:scale-[1.15]">
        <Scene />
      </div>
    </div>
  );
}

/* ---------- ortak yapı taşları ---------- */

function MiniCard({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg bg-card p-2 shadow-sm ring-1 ring-border", className)}>{children}</div>
  );
}

function Line({ className }: { className?: string }) {
  return <div className={cn("h-1.5 rounded-full bg-muted-foreground/25", className)} />;
}

function Chip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.6rem] leading-none font-medium whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  );
}

function Avatar({ letter, className }: { letter: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-5 items-center justify-center rounded-full bg-primary/15 text-[0.55rem] font-semibold text-primary ring-2 ring-card",
        className
      )}
    >
      {letter}
    </span>
  );
}

function IconTile({ icon: Icon, className }: { icon: React.ElementType; className?: string }) {
  return (
    <span className={cn("flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary", className)}>
      <Icon className="size-3.5" />
    </span>
  );
}

/* ---------- sahneler ---------- */

function WelcomeScene() {
  return (
    <div className="relative flex items-center justify-center">
      <span className="absolute size-28 rounded-full bg-primary/15 blur-2xl" />
      <span className="relative flex size-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
        <LightbulbIcon className="size-9" />
      </span>
      <SparklesIcon className="absolute -top-3 -right-6 size-5 text-primary" />
      <SparklesIcon className="absolute -bottom-2 -left-7 size-4 text-primary/60" />
    </div>
  );
}

function WorkspacesScene() {
  const roller = [
    { icon: ShieldCheckIcon, label: "Yönetici" },
    { icon: UsersIcon, label: "Üye" },
    { icon: EyeIcon, label: "İzleyici" },
  ];
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {["Pazarlama", "Ürün", "Ar-Ge"].map((ad, i) => (
          <MiniCard key={ad} className={cn("w-20 p-0", i === 1 && "-translate-y-1.5 ring-primary/40")}>
            <div className={cn("h-1.5 rounded-t-lg", i === 1 ? "bg-primary" : "bg-muted-foreground/30")} />
            <div className="space-y-1.5 p-2">
              <p className="truncate text-[0.6rem] font-semibold">{ad}</p>
              <div className="flex -space-x-1.5">
                <Avatar letter="A" />
                <Avatar letter="B" className="bg-muted text-muted-foreground" />
                <Avatar letter="C" />
              </div>
            </div>
          </MiniCard>
        ))}
      </div>
      <div className="flex gap-1.5">
        {roller.map(({ icon: Icon, label }) => (
          <Chip key={label} className="bg-card text-muted-foreground ring-1 ring-border">
            <Icon className="size-2.5" /> {label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function BoardScene() {
  const kolonlar = [
    { ad: "Taslak", renk: "bg-muted-foreground/50", kartlar: 2 },
    { ad: "İnceleme", renk: "bg-amber-500", kartlar: 1 },
    { ad: "Onaylandı", renk: "bg-primary", kartlar: 1 },
  ];
  return (
    <div className="relative flex gap-2">
      {kolonlar.map((k) => (
        <div key={k.ad} className="w-20 space-y-1.5 rounded-lg bg-muted/60 p-1.5 ring-1 ring-border">
          <p className="flex items-center gap-1 text-[0.55rem] font-semibold">
            <span className={cn("size-1.5 rounded-full", k.renk)} />
            {k.ad}
          </p>
          {Array.from({ length: k.kartlar }).map((_, i) => (
            <MiniCard key={i} className="space-y-1 p-1.5">
              <Line className="w-4/5" />
              <Line className="w-1/2 bg-muted-foreground/15" />
            </MiniCard>
          ))}
        </div>
      ))}
      <MiniCard className="absolute top-9 left-[3.6rem] w-20 rotate-[-6deg] space-y-1 p-1.5 shadow-lg ring-primary/50">
        <div className="flex items-center gap-1">
          <GripVerticalIcon className="size-2.5 text-primary" />
          <Line className="w-3/4 bg-primary/40" />
        </div>
        <Line className="w-1/2 bg-muted-foreground/15" />
      </MiniCard>
      <ArrowRightIcon className="absolute top-[4.6rem] left-[8.4rem] size-4 text-primary" />
    </div>
  );
}

function NewIdeaScene() {
  return (
    <MiniCard className="w-56 space-y-2 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[0.65rem] font-semibold">Yeni Fikir</p>
        <Chip className="bg-muted text-muted-foreground">
          <FileTextIcon className="size-2.5" /> MD İçe Aktar
        </Chip>
      </div>
      <div className="rounded-md bg-muted/60 px-2 py-1.5 text-[0.6rem] font-medium">Mobil uygulamada sesli not</div>
      <div className="space-y-1 rounded-md bg-muted/40 p-2">
        <Line className="w-full" />
        <Line className="w-4/5" />
        <Line className="w-2/3" />
      </div>
      <div className="flex gap-1">
        <Chip className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Etki: Yüksek</Chip>
        <Chip className="bg-sky-500/15 text-sky-600 dark:text-sky-400">Efor: Düşük</Chip>
      </div>
    </MiniCard>
  );
}

function CollaborateScene() {
  return (
    <div className="flex items-start gap-2">
      <MiniCard className="w-32 space-y-2">
        <p className="text-[0.6rem] font-semibold">Sesli not özelliği</p>
        <div className="flex flex-wrap gap-1">
          <Chip className="bg-violet-500/15 text-violet-600 dark:text-violet-400">
            <TagIcon className="size-2.5" /> mobil
          </Chip>
        </div>
        <div className="flex items-center justify-between">
          <Avatar letter="A" />
          <Chip className="bg-primary/10 text-primary">
            <ThumbsUpIcon className="size-2.5" /> 4
          </Chip>
        </div>
      </MiniCard>
      <div className="w-32 space-y-1.5">
        <MiniCard className="space-y-1 p-1.5">
          <p className="flex items-center gap-1 text-[0.55rem] font-semibold">
            <MessageCircleIcon className="size-2.5 text-primary" /> Burak
          </p>
          <p className="text-[0.55rem] leading-snug text-muted-foreground">
            <span className="font-semibold text-primary">
              <AtSignIcon className="inline size-2.5" />
              Ayşe
            </span>{" "}
            buna bakar mısın?
          </p>
        </MiniCard>
        <Chip className="bg-card text-muted-foreground ring-1 ring-border">
          <HistoryIcon className="size-2.5" /> 3 versiyon
        </Chip>
      </div>
    </div>
  );
}

function ProjectsScene() {
  return (
    <div className="flex items-center gap-3">
      <MiniCard className="w-24 space-y-1.5">
        <Chip className="bg-primary/10 text-primary">
          <SproutIcon className="size-2.5" /> Fikir
        </Chip>
        <Line className="w-4/5" />
        <Line className="w-1/2 bg-muted-foreground/15" />
      </MiniCard>
      <ArrowRightIcon className="size-4 shrink-0 text-primary" />
      <MiniCard className="w-32 space-y-1.5 p-0">
        <div className="h-1.5 rounded-t-lg bg-primary" />
        <div className="space-y-1.5 px-2 pb-2">
          <p className="flex items-center gap-1 text-[0.6rem] font-semibold">
            <FolderKanbanIcon className="size-3 text-primary" /> Proje
          </p>
          {["Çıkış fikri", "Özellik", "Özellik"].map((ad, i) => (
            <div key={i} className="flex items-center gap-1 rounded bg-muted/60 px-1.5 py-1 text-[0.55rem]">
              {i === 0 ? <SproutIcon className="size-2.5 text-primary" /> : <LightbulbIcon className="size-2.5 text-muted-foreground" />}
              {ad}
            </div>
          ))}
        </div>
      </MiniCard>
    </div>
  );
}

function LiveScene() {
  return (
    <div className="flex items-center gap-3">
      <MiniCard className="w-36 space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <Line className="w-1/2" />
          <Chip className="bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <PencilIcon className="size-2.5" /> Ayşe düzenliyor
          </Chip>
        </div>
        <Line className="w-full bg-muted-foreground/15" />
        <Line className="w-2/3 bg-muted-foreground/15" />
      </MiniCard>
      <div className="space-y-1.5">
        <span className="relative flex size-8 items-center justify-center rounded-full bg-card ring-1 ring-border">
          <BellIcon className="size-3.5" />
          <span className="absolute -top-0.5 -right-0.5 flex size-3 items-center justify-center rounded-full bg-destructive text-[0.45rem] font-bold text-white">
            2
          </span>
        </span>
        <span className="flex size-8 items-center justify-center rounded-full bg-card text-primary ring-1 ring-border">
          <ActivityIcon className="size-3.5" />
        </span>
      </div>
    </div>
  );
}

function FindShareScene() {
  return (
    <div className="flex w-60 flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <div className="flex flex-1 items-center gap-1 rounded-md bg-card px-2 py-1.5 text-[0.6rem] text-muted-foreground ring-1 ring-border">
          <SearchIcon className="size-3" /> Fikir ara…
        </div>
        <Chip className="bg-primary/10 py-1 text-primary">#mobil</Chip>
      </div>
      <div className="flex gap-2">
        <MiniCard className="flex-1 space-y-1.5">
          <p className="flex items-center gap-1 text-[0.55rem] font-semibold">
            <ChartNoAxesCombinedIcon className="size-2.5 text-primary" /> Genel Bakış
          </p>
          <div className="flex h-9 items-end gap-1">
            {[45, 80, 30, 60].map((h, i) => (
              <span key={i} className="flex-1 rounded-sm bg-primary/70" style={{ height: `${h}%` }} />
            ))}
          </div>
        </MiniCard>
        <div className="flex flex-col gap-1.5">
          <IconTile icon={ImageIcon} />
          <IconTile icon={FileTextIcon} />
        </div>
      </div>
    </div>
  );
}

function ArchiveScene() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3 rounded-lg bg-card px-3 py-2 text-[0.65rem] shadow-md ring-1 ring-border">
        <span>Fikir silindi</span>
        <span className="flex items-center gap-1 font-semibold text-primary">
          <RotateCcwIcon className="size-3" /> Geri Al
        </span>
      </div>
      <div className="flex items-center gap-2">
        <MiniCard className="w-20 space-y-1 p-1.5 opacity-60">
          <Line className="w-4/5" />
          <Line className="w-1/2 bg-muted-foreground/15" />
        </MiniCard>
        <ArrowRightIcon className="size-3.5 text-primary" />
        <IconTile icon={ArchiveIcon} className="size-9" />
      </div>
    </div>
  );
}

function DoneScene() {
  return (
    <div className="relative flex items-center justify-center">
      <span className="absolute size-28 rounded-full bg-emerald-500/15 blur-2xl" />
      <span className="relative flex size-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
        <CheckIcon className="size-8" strokeWidth={3} />
      </span>
      <span className="absolute -top-3 -right-10 flex size-7 items-center justify-center rounded-full bg-card text-xs font-bold text-primary ring-1 ring-border">
        ?
      </span>
      <PlusIcon className="absolute -bottom-1 -left-8 size-4 rotate-12 text-primary/60" />
      <SparklesIcon className="absolute -top-4 -left-5 size-4 text-emerald-500/70" />
    </div>
  );
}

const SCENES: Record<TourIllustration, () => React.JSX.Element> = {
  welcome: WelcomeScene,
  workspaces: WorkspacesScene,
  board: BoardScene,
  "new-idea": NewIdeaScene,
  collaborate: CollaborateScene,
  projects: ProjectsScene,
  live: LiveScene,
  "find-share": FindShareScene,
  archive: ArchiveScene,
  done: DoneScene,
};
