"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
    <div className="flex flex-col gap-5 rounded-xl border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold">Genel</h2>
        <p className="text-sm text-muted-foreground">Workspace&apos;in temel bilgileri.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="workspace-name">Workspace Adı</Label>
        {isOwner ? (
          <div className="flex gap-2">
            <Input
              id="workspace-name"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="max-w-sm"
            />
            <Button
              type="button"
              size="sm"
              disabled={isPending || !value.trim() || value.trim() === title}
              onClick={onSave}
            >
              Kaydet
            </Button>
          </div>
        ) : (
          <p className="text-sm">{title}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="workspace-description">Açıklama</Label>
          {isOwner && (
            <span className="text-xs text-muted-foreground">
              {descriptionValue.length}/{DESCRIPTION_MAX_LENGTH}
            </span>
          )}
        </div>
        {isOwner ? (
          <div className="flex flex-col gap-2">
            <Textarea
              id="workspace-description"
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.target.value.slice(0, DESCRIPTION_MAX_LENGTH))}
              placeholder="Bu workspace ne için kullanılıyor?"
              maxLength={DESCRIPTION_MAX_LENGTH}
              className="max-w-sm resize-none"
            />
            <Button
              type="button"
              size="sm"
              className="self-start"
              disabled={
                isDescriptionPending || descriptionValue.trim() === (description ?? "")
              }
              onClick={onSaveDescription}
            >
              Kaydet
            </Button>
          </div>
        ) : (
          <p className="text-sm">{description || "Açıklama eklenmemiş."}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-muted-foreground">Oluşturulma Tarihi</Label>
        <p className="text-sm">{new Date(createdAt).toLocaleDateString("tr-TR", { dateStyle: "long" })}</p>
      </div>
    </div>
  );
}
