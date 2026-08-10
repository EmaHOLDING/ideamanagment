"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateWorkspaceTitle } from "@/app/actions/workspaceActions";

export function GeneralSettingsSection({
  workspaceId,
  title,
  createdAt,
  isOwner,
}: {
  workspaceId: string;
  title: string;
  createdAt: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(title);
  const [isPending, startTransition] = useTransition();

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

      <div className="flex flex-col gap-1">
        <Label className="text-muted-foreground">Oluşturulma Tarihi</Label>
        <p className="text-sm">{new Date(createdAt).toLocaleDateString("tr-TR", { dateStyle: "long" })}</p>
      </div>
    </div>
  );
}
