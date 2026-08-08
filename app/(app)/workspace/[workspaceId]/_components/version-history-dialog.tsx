"use client";

import { useState, type ReactElement } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TiptapContentView } from "@/components/editor/tiptap-content-view";
import { getIdeaVersionHistory } from "@/app/actions/ideaActions";
import { IMPACT_EFFORT_LABELS } from "@/lib/status";
import { cn } from "@/lib/utils";

type VersionWithAuthor = Awaited<ReturnType<typeof getIdeaVersionHistory>>[number];

const CHANGE_LABELS: Record<string, string> = {
  title: "Başlık",
  content: "İçerik",
  problem_statement: "Problem",
  target_audience: "Hedef Kitle",
  impact_score: "Etki",
  effort_score: "Efor",
};

function changedFields(
  current: VersionWithAuthor,
  previous: VersionWithAuthor | undefined
): string[] {
  if (!previous) return [];
  const fields: (keyof VersionWithAuthor)[] = [
    "title",
    "content",
    "problem_statement",
    "target_audience",
    "impact_score",
    "effort_score",
  ];
  return fields
    .filter((f) => JSON.stringify(current[f]) !== JSON.stringify(previous[f]))
    .map((f) => CHANGE_LABELS[f]);
}

export function VersionHistoryDialog({
  ideaId,
  trigger,
}: {
  ideaId: string;
  trigger: ReactElement;
}) {
  const [versions, setVersions] = useState<VersionWithAuthor[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function onOpenChange(open: boolean) {
    if (!open || versions !== null) return;
    setLoading(true);
    try {
      const data = await getIdeaVersionHistory(ideaId);
      setVersions(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Versiyon geçmişi yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="flex h-[80vh] max-h-[80vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="gap-1.5 border-b px-5 py-4">
          <DialogTitle>Versiyon Geçmişi</DialogTitle>
          <DialogDescription>
            Fikir üzerindeki tüm değişiklikler, en yeniden en eskiye doğru soldan sağa listelenir.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
          {loading && (
            <p className="p-5 text-sm text-muted-foreground">Yükleniyor...</p>
          )}
          {versions && versions.length === 0 && (
            <p className="p-5 text-sm text-muted-foreground">Versiyon bulunamadı.</p>
          )}
          {versions && versions.length > 0 && (
            <div className="flex h-full items-stretch gap-0 p-5">
              {versions.map((v, idx) => {
                const changes = changedFields(v, versions[idx + 1]);
                const isLatest = idx === 0;
                return (
                  <div key={v.id} className="flex h-full shrink-0 items-stretch">
                    <div
                      className={cn(
                        "flex h-full w-80 shrink-0 flex-col gap-3 overflow-hidden rounded-xl border bg-card p-4 shadow-sm",
                        isLatest && "border-primary/40 ring-1 ring-primary/20"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={isLatest ? "default" : "secondary"}>
                          v{v.version_number}
                        </Badge>
                        {isLatest && <Badge variant="outline">Güncel</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p className="truncate font-medium text-foreground/80">
                          {v.authorEmail ?? "Bilinmeyen kullanıcı"}
                        </p>
                        <p>{new Date(v.created_at).toLocaleString("tr-TR")}</p>
                      </div>

                      {changes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {changes.map((c) => (
                            <Badge key={c} variant="outline" className="text-[0.7rem]">
                              {c} değişti
                            </Badge>
                          ))}
                        </div>
                      )}

                      <p className="line-clamp-2 text-sm font-semibold">{v.title}</p>

                      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-muted/20 px-3 py-2">
                        <TiptapContentView content={v.content} className="text-muted-foreground" />
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline">
                          Etki: {IMPACT_EFFORT_LABELS[v.impact_score ?? "MEDIUM"]}
                        </Badge>
                        <Badge variant="outline">
                          Efor: {IMPACT_EFFORT_LABELS[v.effort_score ?? "MEDIUM"]}
                        </Badge>
                      </div>
                    </div>
                    {idx < versions.length - 1 && (
                      <div className="flex w-8 shrink-0 items-center justify-center">
                        <div className="h-px w-full bg-border" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
