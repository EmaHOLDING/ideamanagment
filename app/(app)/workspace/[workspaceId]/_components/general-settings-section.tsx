"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDaysIcon, LoaderCircleIcon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateWorkspaceTitle, updateWorkspaceDescription } from "@/app/actions/workspaceActions";

const DESCRIPTION_MAX_LENGTH = 250;

export function GeneralSettingsSection({
  workspaceId,
  title,
  description,
  createdAt,
  isOwner,
}: {
  workspaceId: string;
  title: string;
  description: string | null;
  createdAt: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(title);
  const [isPending, startTransition] = useTransition();
  const [descriptionValue, setDescriptionValue] = useState(description ?? "");
  const [isDescriptionPending, startDescriptionTransition] = useTransition();

  function onSave() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === title) return;
    startTransition(async () => {
      try {
        await updateWorkspaceTitle(workspaceId, trimmed);
        toast.success("Workspace adı güncellendi");
        router.refresh();
      } catch (err) {
        setValue(title);
        toast.error(err instanceof Error ? err.message : "Workspace adı güncellenemedi");
      }
    });
  }

  function onSaveDescription() {
    const trimmed = descriptionValue.trim();
    if (trimmed === (description ?? "")) return;
    startDescriptionTransition(async () => {
      try {
        await updateWorkspaceDescription(workspaceId, trimmed);
        toast.success("Açıklama güncellendi");
        router.refresh();
      } catch (err) {
        setDescriptionValue(description ?? "");
        toast.error(err instanceof Error ? err.message : "Açıklama güncellenemedi");
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold">Genel</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Workspace&apos;in ekip tarafından görünen temel bilgilerini yönetin.
        </p>
      </div>

      <div className="divide-y">
        <section className="grid gap-3 px-5 py-5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-6 sm:px-6">
          <div>
            <Label htmlFor="workspace-name">Workspace Adı</Label>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Pano başlığında ve workspace listesinde görünür.
            </p>
          </div>
          {isOwner ? (
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
              <Input
                id="workspace-name"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                size="sm"
                className="shrink-0 self-start"
                disabled={isPending || !value.trim() || value.trim() === title}
                onClick={onSave}
              >
                {isPending ? <LoaderCircleIcon className="animate-spin" /> : <SaveIcon />}
                Kaydet
              </Button>
            </div>
          ) : (
            <p className="text-sm">{title}</p>
          )}
        </section>

        <section className="grid gap-3 px-5 py-5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-6 sm:px-6">
          <div>
            <Label htmlFor="workspace-description">Açıklama</Label>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Ekibin bu alanın amacını hızlıca anlamasına yardımcı olur.
            </p>
          </div>
          {isOwner ? (
            <div className="min-w-0">
              <Textarea
                id="workspace-description"
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
                placeholder="Bu workspace ne için kullanılıyor?"
                maxLength={DESCRIPTION_MAX_LENGTH}
                className="min-h-24 resize-none"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs tabular-nums text-muted-foreground">
                  {descriptionValue.length}/{DESCRIPTION_MAX_LENGTH}
                </span>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    isDescriptionPending || descriptionValue.trim() === (description ?? "")
                  }
                  onClick={onSaveDescription}
                >
                  {isDescriptionPending ? <LoaderCircleIcon className="animate-spin" /> : <SaveIcon />}
                  Kaydet
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed">{description || "Açıklama eklenmemiş."}</p>
          )}
        </section>
      </div>

      <div className="flex items-center gap-2 border-t bg-muted/20 px-5 py-3.5 text-xs text-muted-foreground sm:px-6">
        <CalendarDaysIcon className="size-3.5" />
        <span>Oluşturulma tarihi</span>
        <span className="font-medium text-foreground/80">
          {new Date(createdAt).toLocaleDateString("tr-TR", { dateStyle: "long" })}
        </span>
      </div>
    </div>
  );
}
