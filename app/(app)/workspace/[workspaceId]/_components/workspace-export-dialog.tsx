"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { CheckIcon, ClipboardIcon, DownloadIcon, ImageIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/lib/types/database.types";
import { projectColorHex } from "@/lib/project-colors";

type Column = Database["public"]["Tables"]["kanban_columns"]["Row"];
type IdeaVersion = Database["public"]["Tables"]["idea_versions"]["Row"];
type Tag = Database["public"]["Tables"]["tags"]["Row"];
type Project = Database["public"]["Tables"]["projects"]["Row"];
type ExportMode = "share" | "full";
type ExportTheme = "light" | "dark";
type ExportOutput = "kanban" | "report";

export type WorkspaceExportData = {
  workspaceTitle: string;
  columns: Column[];
  visibleVersionsByColumn: Record<string, IdeaVersion[]>;
  allVersionsByColumn: Record<string, IdeaVersion[]>;
  tagsByIdea: Record<string, Tag[]>;
  projectByIdea: Record<string, string | null>;
  projects: Project[];
  voteCountByIdea: Record<string, number>;
};

type Options = {
  output: ExportOutput;
  mode: ExportMode;
  theme: ExportTheme;
  useCurrentFilters: boolean;
  showDescriptions: boolean;
  showTags: boolean;
  showProjects: boolean;
  showScores: boolean;
};

const DEFAULT_OPTIONS: Options = {
  output: "kanban",
  mode: "share",
  theme: "dark",
  useCurrentFilters: true,
  showDescriptions: true,
  showTags: true,
  showProjects: true,
  showScores: true,
};

export function WorkspaceExportDialog({ data }: { data: WorkspaceExportData }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);
  const [selectedColumnIds, setSelectedColumnIds] = useState(() => data.columns.map((column) => column.id));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const exportInput = useMemo(() => ({ data, options, selectedColumnIds }), [data, options, selectedColumnIds]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      startTransition(() => {
        const canvas = options.output === "report" ? renderSummaryReport(exportInput)[0] : renderWorkspaceExport(exportInput);
        if (!cancelled) setPreviewUrl(canvas.toDataURL("image/png"));
      });
    }, 100);
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [exportInput, open, options.output]);

  function toggleColumn(columnId: string) {
    setSelectedColumnIds((current) => current.includes(columnId) ? current.filter((id) => id !== columnId) : [...current, columnId]);
  }

  function getCanvas() {
    if (selectedColumnIds.length === 0) {
      toast.error("En az bir kolon seçin.");
      return null;
    }
    return renderWorkspaceExport(exportInput);
  }

  function download() {
    const canvas = getCanvas();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${slugify(data.workspaceTitle)}-${options.mode === "share" ? "paylasim" : "kanban"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function downloadPdf() {
    if (selectedColumnIds.length === 0) return void toast.error("En az bir kolon seçin.");
    const pages = renderSummaryReport(exportInput);
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [620, 877], hotfixes: ["px_scaling"] });
    pages.forEach((page, index) => {
      if (index > 0) pdf.addPage([620, 877], "portrait");
      pdf.addImage(page.toDataURL("image/png"), "PNG", 0, 0, 620, 877, undefined, "FAST");
    });
    pdf.save(`${slugify(data.workspaceTitle)}-ozet-raporu.pdf`);
  }

  async function copyToClipboard() {
    const canvas = getCanvas();
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob || !navigator.clipboard || typeof ClipboardItem === "undefined") throw new Error("unsupported");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("Görsel panoya kopyalandı");
    } catch {
      toast.error("Tarayıcı görsel kopyalamayı desteklemiyor. PNG olarak indirebilirsiniz.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />} nativeButton>
        <ImageIcon /> <span className="hidden sm:inline">Dışarı Aktar</span>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-x-hidden overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Workspace&apos;i dışarı aktar</DialogTitle>
          <DialogDescription>{options.output === "report" ? "Workspace verilerinden iki sayfalık, paylaşılabilir bir PDF özeti hazırlayın." : "Kanban'ın paylaşılabilir, arayüz kontrollerinden arındırılmış PNG görüntüsünü hazırlayın."}</DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <div className="space-y-5">
            <Field label="Çıktı Türü">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={options.output === "kanban" ? "default" : "outline"} onClick={() => setOptions((current) => ({ ...current, output: "kanban" }))}>Kanban Görseli</Button>
                <Button type="button" variant={options.output === "report" ? "default" : "outline"} onClick={() => setOptions((current) => ({ ...current, output: "report" }))}>Özet Rapor</Button>
              </div>
            </Field>
            {options.output === "kanban" && <>
            <Field label="Görünüm">
              <Select value={options.mode} onValueChange={(value) => setOptions((current) => ({ ...current, mode: (value ?? "share") as ExportMode }))}>
                <SelectTrigger><SelectValue>{options.mode === "share" ? "Paylaşım Kartı" : "Tam Kanban"}</SelectValue></SelectTrigger>
                <SelectContent><SelectItem value="share">Paylaşım Kartı</SelectItem><SelectItem value="full">Tam Kanban</SelectItem></SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{options.mode === "share" ? "Her kolondan en fazla 5 fikir gösterir." : "Seçili kolonlardaki tüm fikirleri gösterir."}</p>
            </Field>
            </>}
            <Field label="Tema">
              <Select value={options.theme} onValueChange={(value) => setOptions((current) => ({ ...current, theme: (value ?? "dark") as ExportTheme }))}>
                <SelectTrigger><SelectValue>{options.theme === "dark" ? "Koyu" : "Açık"}</SelectValue></SelectTrigger>
                <SelectContent><SelectItem value="dark">Koyu</SelectItem><SelectItem value="light">Açık</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Kolonlar">
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
                {data.columns.map((column) => <OptionRow key={column.id} checked={selectedColumnIds.includes(column.id)} onChange={() => toggleColumn(column.id)} label={column.title} />)}
              </div>
            </Field>
            <Field label="İçerik">
              <div className="space-y-1">
                <OptionRow checked={options.useCurrentFilters} onChange={() => setOptions((c) => ({ ...c, useCurrentFilters: !c.useCurrentFilters }))} label="Mevcut filtreleri kullan" />
                {options.output === "kanban" && <OptionRow checked={options.showDescriptions} onChange={() => setOptions((c) => ({ ...c, showDescriptions: !c.showDescriptions }))} label="Açıklamaları göster" />}
                {options.output === "kanban" && <OptionRow checked={options.showProjects} onChange={() => setOptions((c) => ({ ...c, showProjects: !c.showProjects }))} label="Projeleri göster" />}
                {options.output === "kanban" && <OptionRow checked={options.showTags} onChange={() => setOptions((c) => ({ ...c, showTags: !c.showTags }))} label="Etiketleri göster" />}
                {options.output === "kanban" && <OptionRow checked={options.showScores} onChange={() => setOptions((c) => ({ ...c, showScores: !c.showScores }))} label="Etki ve eforu göster" />}
              </div>
            </Field>
          </div>
          <div className="min-w-0 overflow-hidden rounded-xl border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium">Önizleme</span>{isPending && <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" />}</div>
            <div className="flex min-h-80 items-center justify-center overflow-auto rounded-lg bg-black/10 p-2">
              {previewUrl ? <Image src={previewUrl} alt="Dışa aktarma önizlemesi" width={1200} height={800} unoptimized className="h-auto max-h-[60dvh] w-auto max-w-full rounded-md object-contain shadow-xl" /> : <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />}
            </div>
          </div>
        </div>
        <DialogFooter className="flex-row justify-end">
          {options.output === "kanban" && <Button variant="outline" onClick={copyToClipboard}><ClipboardIcon /> Panoya Kopyala</Button>}
          {options.output === "kanban" ? <Button onClick={download}><DownloadIcon /> PNG İndir</Button> : <Button onClick={downloadPdf}><DownloadIcon /> PDF İndir</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function OptionRow({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) { return <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"><Checkbox checked={checked} onCheckedChange={onChange} /><span>{label}</span>{checked && <CheckIcon className="ml-auto size-3 text-primary" />}</label>; }

function renderWorkspaceExport({ data, options, selectedColumnIds }: { data: WorkspaceExportData; options: Options; selectedColumnIds: string[] }) {
  const columns = data.columns.filter((column) => selectedColumnIds.includes(column.id));
  const versions = options.useCurrentFilters ? data.visibleVersionsByColumn : data.allVersionsByColumn;
  const scale = 2;
  const columnWidth = 300;
  const gap = 18;
  const padding = 30;
  const headerHeight = 92;
  const footerHeight = 42;
  const cardsByColumn = columns.map((column) => {
    const all = versions[column.id] ?? [];
    return { column, all, shown: options.mode === "share" ? all.slice(0, 5) : all };
  });
  const cardHeights = cardsByColumn.map(({ shown, all }) => shown.reduce((sum, idea) => sum + measureCardHeight(idea, options, data) + 12, all.length > shown.length ? 42 : 0));
  const width = Math.max(720, padding * 2 + columns.length * columnWidth + Math.max(0, columns.length - 1) * gap);
  const height = Math.max(520, headerHeight + padding + Math.max(320, ...cardHeights) + footerHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width * scale; canvas.height = height * scale;
  const ctx = canvas.getContext("2d")!; ctx.scale(scale, scale);
  const palette = options.theme === "dark" ? { bg: "#090d16", panel: "#111827", card: "#171d29", text: "#f4f7fb", muted: "#9aa5b5", border: "#2a3444", accent: "#7c83ff" } : { bg: "#f5f7fb", panel: "#e9edf5", card: "#ffffff", text: "#172033", muted: "#687386", border: "#d9dfeb", accent: "#555ce7" };
  ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = palette.accent; ctx.fillRect(0, 0, 7, height);
  ctx.fillStyle = palette.text; ctx.font = "700 24px Arial"; drawEllipsis(ctx, data.workspaceTitle, padding, 38, width - padding * 2 - 150);
  ctx.fillStyle = palette.muted; ctx.font = "13px Arial"; ctx.fillText("Fikir Kanbanı", padding, 62);
  ctx.textAlign = "right"; ctx.fillText(new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date()), width - padding, 38); ctx.textAlign = "left";
  cardsByColumn.forEach(({ column, all, shown }, index) => {
    const x = padding + index * (columnWidth + gap); let y = headerHeight;
    roundRect(ctx, x, y, columnWidth, height - headerHeight - footerHeight, 14, palette.panel);
    ctx.fillStyle = palette.text; ctx.font = "700 15px Arial"; drawEllipsis(ctx, column.title, x + 16, y + 28, columnWidth - 68);
    ctx.fillStyle = palette.muted; ctx.font = "12px Arial"; ctx.textAlign = "right"; ctx.fillText(String(all.length), x + columnWidth - 16, y + 28); ctx.textAlign = "left"; y += 48;
    for (const idea of shown) { const h = measureCardHeight(idea, options, data); drawIdeaCard(ctx, idea, x + 10, y, columnWidth - 20, h, options, data, palette); y += h + 12; }
    if (all.length > shown.length) { ctx.fillStyle = palette.muted; ctx.font = "600 12px Arial"; ctx.textAlign = "center"; ctx.fillText(`+${all.length - shown.length} fikir daha`, x + columnWidth / 2, y + 17); ctx.textAlign = "left"; }
  });
  ctx.fillStyle = palette.muted; ctx.font = "11px Arial"; ctx.fillText("Idea Management · Paylaşım görünümü", padding, height - 16);
  return canvas;
}

function renderSummaryReport({ data, options, selectedColumnIds }: { data: WorkspaceExportData; options: Options; selectedColumnIds: string[] }) {
  const columns = data.columns.filter((column) => selectedColumnIds.includes(column.id));
  const versions = options.useCurrentFilters ? data.visibleVersionsByColumn : data.allVersionsByColumn;
  const ideas = columns.flatMap((column) => (versions[column.id] ?? []).map((idea) => ({ idea, column })));
  const projectMap = new Map(data.projects.map((project) => [project.id, project]));
  const projectCounts = new Map<string, number>();
  for (const { idea } of ideas) {
    const projectId = data.projectByIdea[idea.idea_id];
    if (projectId) projectCounts.set(projectId, (projectCounts.get(projectId) ?? 0) + 1);
  }
  const highImpact = ideas.filter(({ idea }) => idea.impact_score === "HIGH").length;
  const quickWins = ideas.filter(({ idea }) => idea.impact_score === "HIGH" && idea.effort_score === "LOW");
  const topVoted = [...ideas].sort((a, b) => (data.voteCountByIdea[b.idea.idea_id] ?? 0) - (data.voteCountByIdea[a.idea.idea_id] ?? 0)).slice(0, 7);
  const palette = options.theme === "dark"
    ? { bg: "#090d16", panel: "#121927", card: "#171f2e", text: "#f4f7fb", muted: "#98a5b8", border: "#2a3548", accent: "#7c83ff", success: "#36c98f" }
    : { bg: "#f5f7fb", panel: "#e9edf5", card: "#ffffff", text: "#172033", muted: "#687386", border: "#d8dfeb", accent: "#555ce7", success: "#15966a" };
  const pages = [createReportCanvas(palette), createReportCanvas(palette)];
  const [cover, detail] = pages.map((canvas) => canvas.getContext("2d")!);
  drawReportHeader(cover, data.workspaceTitle, "Yönetici Özeti", palette, 1);
  drawMetric(cover, 34, 122, 168, "Toplam fikir", String(ideas.length), palette.accent, palette);
  drawMetric(cover, 218, 122, 168, "Aktif proje", String(projectCounts.size), "#3b9cff", palette);
  drawMetric(cover, 402, 122, 168, "Yüksek etki", String(highImpact), "#f59e42", palette);
  drawMetric(cover, 34, 225, 260, "Hızlı kazanım", String(quickWins.length), palette.success, palette, "Yüksek etki · düşük efor");
  drawMetric(cover, 310, 225, 260, "Kapsanan kolon", String(columns.length), "#b06cff", palette, options.useCurrentFilters ? "Mevcut filtreler uygulandı" : "Tüm fikirler dahil edildi");
  drawBarSection(cover, "Kolon dağılımı", columns.map((column) => ({ label: column.title, value: versions[column.id]?.length ?? 0, color: palette.accent })), 34, 352, 536, palette);
  drawBarSection(cover, "Proje dağılımı", [...projectCounts.entries()].map(([id, value]) => ({ label: projectMap.get(id)?.name ?? "Bilinmeyen proje", value, color: projectColorHex(projectMap.get(id)?.color) })).sort((a, b) => b.value - a.value).slice(0, 6), 34, 590, 536, palette);
  drawReportFooter(cover, palette, 1, 2);

  drawReportHeader(detail, data.workspaceTitle, "Öne Çıkan Fikirler", palette, 2);
  drawIdeaList(detail, "En çok oy alan fikirler", topVoted, 34, 122, 536, palette, data, true);
  drawIdeaList(detail, "Hızlı kazanımlar", quickWins.slice(0, 6), 34, 485, 536, palette, data, false);
  drawReportFooter(detail, palette, 2, 2);
  return pages;
}

type ReportPalette = Record<"bg" | "panel" | "card" | "text" | "muted" | "border" | "accent" | "success", string>;
type ReportIdea = { idea: IdeaVersion; column: Column };

function createReportCanvas(palette: ReportPalette) {
  const canvas = document.createElement("canvas");
  canvas.width = 1240; canvas.height = 1754;
  const ctx = canvas.getContext("2d")!; ctx.scale(2, 2);
  ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, 620, 877);
  ctx.fillStyle = palette.accent; ctx.fillRect(0, 0, 8, 877);
  return canvas;
}

function drawReportHeader(ctx: CanvasRenderingContext2D, workspace: string, title: string, palette: ReportPalette, page: number) {
  ctx.fillStyle = palette.text; ctx.font = "700 25px Arial"; drawEllipsis(ctx, workspace, 34, 45, 430);
  ctx.fillStyle = palette.accent; ctx.font = "700 12px Arial"; ctx.fillText(title.toLocaleUpperCase("tr-TR"), 34, 72);
  ctx.fillStyle = palette.muted; ctx.font = "11px Arial"; ctx.textAlign = "right";
  ctx.fillText(new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date()), 586, 42);
  ctx.fillText(`Sayfa ${page}`, 586, 62); ctx.textAlign = "left";
}

function drawMetric(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, label: string, value: string, color: string, palette: ReportPalette, note?: string) {
  roundRect(ctx, x, y, width, 84, 13, palette.card);
  ctx.fillStyle = color; ctx.fillRect(x, y + 14, 4, 56);
  ctx.fillStyle = palette.muted; ctx.font = "600 11px Arial"; ctx.fillText(label.toLocaleUpperCase("tr-TR"), x + 17, y + 25);
  ctx.fillStyle = palette.text; ctx.font = "700 28px Arial"; ctx.fillText(value, x + 17, y + 58);
  if (note) { ctx.fillStyle = palette.muted; ctx.font = "10px Arial"; drawEllipsis(ctx, note, x + 17, y + 75, width - 34); }
}

function drawBarSection(ctx: CanvasRenderingContext2D, title: string, rows: { label: string; value: number; color: string }[], x: number, y: number, width: number, palette: ReportPalette) {
  ctx.fillStyle = palette.text; ctx.font = "700 16px Arial"; ctx.fillText(title, x, y);
  const shown = rows.length ? rows : [{ label: "Henüz veri yok", value: 0, color: palette.muted }];
  const max = Math.max(1, ...shown.map((row) => row.value));
  shown.slice(0, 6).forEach((row, index) => {
    const rowY = y + 27 + index * 31;
    ctx.fillStyle = palette.muted; ctx.font = "11px Arial"; drawEllipsis(ctx, row.label, x, rowY, 155);
    roundRect(ctx, x + 170, rowY - 10, width - 205, 10, 5, palette.panel);
    if (row.value > 0) roundRect(ctx, x + 170, rowY - 10, Math.max(8, (width - 205) * row.value / max), 10, 5, row.color);
    ctx.fillStyle = palette.text; ctx.font = "700 11px Arial"; ctx.textAlign = "right"; ctx.fillText(String(row.value), x + width, rowY); ctx.textAlign = "left";
  });
}

function drawIdeaList(ctx: CanvasRenderingContext2D, title: string, rows: ReportIdea[], x: number, y: number, width: number, palette: ReportPalette, data: WorkspaceExportData, showVotes: boolean) {
  ctx.fillStyle = palette.text; ctx.font = "700 16px Arial"; ctx.fillText(title, x, y);
  const shown = rows.length ? rows : null;
  if (!shown) { ctx.fillStyle = palette.muted; ctx.font = "12px Arial"; ctx.fillText("Bu ölçüte uyan fikir bulunmuyor.", x, y + 32); return; }
  shown.forEach(({ idea, column }, index) => {
    const rowY = y + 18 + index * 46;
    roundRect(ctx, x, rowY, width, 38, 9, palette.card);
    ctx.fillStyle = palette.text; ctx.font = "600 11px Arial"; drawEllipsis(ctx, idea.title, x + 13, rowY + 16, width - 165);
    ctx.fillStyle = palette.muted; ctx.font = "10px Arial"; drawEllipsis(ctx, column.title, x + 13, rowY + 30, 180);
    ctx.textAlign = "right"; ctx.fillStyle = showVotes ? palette.accent : palette.success; ctx.font = "700 10px Arial";
    ctx.fillText(showVotes ? `${data.voteCountByIdea[idea.idea_id] ?? 0} oy` : "Yüksek etki · Düşük efor", x + width - 13, rowY + 23); ctx.textAlign = "left";
  });
}

function drawReportFooter(ctx: CanvasRenderingContext2D, palette: ReportPalette, current: number, total: number) {
  ctx.strokeStyle = palette.border; ctx.beginPath(); ctx.moveTo(34, 840); ctx.lineTo(586, 840); ctx.stroke();
  ctx.fillStyle = palette.muted; ctx.font = "10px Arial"; ctx.fillText("Idea Management · Özet raporu", 34, 859);
  ctx.textAlign = "right"; ctx.fillText(`${current} / ${total}`, 586, 859); ctx.textAlign = "left";
}

function measureCardHeight(idea: IdeaVersion, options: Options, data: WorkspaceExportData) {
  let height = 55;
  if (options.showDescriptions && idea.content) height += 46;
  if ((options.showProjects && data.projectByIdea[idea.idea_id]) || (options.showTags && (data.tagsByIdea[idea.idea_id]?.length ?? 0) > 0)) height += 26;
  if (options.showScores) height += 32;
  return height;
}

function drawIdeaCard(ctx: CanvasRenderingContext2D, idea: IdeaVersion, x: number, y: number, width: number, height: number, options: Options, data: WorkspaceExportData, palette: Record<string, string>) {
  const project = data.projects.find((item) => item.id === data.projectByIdea[idea.idea_id]); const color = projectColorHex(project?.color);
  roundRect(ctx, x, y, width, height, 11, palette.card); if (project) { ctx.fillStyle = color; ctx.fillRect(x, y + 9, 4, height - 18); }
  ctx.fillStyle = palette.text; ctx.font = "700 13px Arial"; drawWrappedText(ctx, idea.title, x + 14, y + 23, width - 28, 17, 2);
  let cursor = y + 55;
  if (options.showDescriptions && idea.content) { ctx.fillStyle = palette.muted; ctx.font = "11px Arial"; drawWrappedText(ctx, plainText(idea.content), x + 14, cursor, width - 28, 15, 2); cursor += 46; }
  if (options.showProjects && project) { drawPill(ctx, project.name, x + 14, cursor - 3, color, palette.card); cursor += 24; }
  if (options.showTags) { let tx = project && options.showProjects ? x + 120 : x + 14; for (const tag of (data.tagsByIdea[idea.idea_id] ?? []).slice(0, 2)) { tx += drawPill(ctx, tag.name, tx, cursor - 27, "#8792a6", palette.card) + 5; } }
  if (options.showScores) { ctx.strokeStyle = palette.border; ctx.beginPath(); ctx.moveTo(x + 14, height + y - 30); ctx.lineTo(x + width - 14, height + y - 30); ctx.stroke(); ctx.fillStyle = palette.muted; ctx.font = "10px Arial"; ctx.fillText(`ETKİ  ${scoreLabel(idea.impact_score)}`, x + 14, y + height - 11); ctx.fillText(`EFOR  ${scoreLabel(idea.effort_score)}`, x + 102, y + height - 11); }
}

function drawPill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, background: string) { ctx.font = "600 10px Arial"; const width = Math.min(100, ctx.measureText(text).width + 20); roundRect(ctx, x, y, width, 18, 9, color); ctx.fillStyle = background; drawEllipsis(ctx, text, x + 9, y + 12, width - 18); return width; }
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string) { ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fillStyle = fill; ctx.fill(); }
function drawEllipsis(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) { let output = text; while (output.length > 1 && ctx.measureText(output).width > maxWidth) output = `${output.slice(0, -2)}…`; ctx.fillText(output, x, y); }
function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) { const words = text.split(/\s+/); let line = ""; let lineNo = 0; for (const word of words) { const test = line ? `${line} ${word}` : word; if (ctx.measureText(test).width > maxWidth && line) { drawEllipsis(ctx, line, x, y + lineNo * lineHeight, maxWidth); line = word; if (++lineNo >= maxLines) return; } else line = test; } if (lineNo < maxLines) drawEllipsis(ctx, line, x, y + lineNo * lineHeight, maxWidth); }
function plainText(markdown: string) { return markdown.replace(/[#*_>`~\[\]()!-]/g, " ").replace(/\s+/g, " ").trim(); }
function scoreLabel(value: string | null) { return value === "HIGH" ? "Yüksek" : value === "LOW" ? "Düşük" : "Orta"; }
function slugify(value: string) { return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace"; }
