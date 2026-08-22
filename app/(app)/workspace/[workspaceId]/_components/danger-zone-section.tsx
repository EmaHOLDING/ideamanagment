"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { softDeleteWorkspaceAction, undoDeleteWorkspaceAction } from "@/app/actions/workspaceActions";

export function DangerZoneSection({
  workspaceId,
  workspaceTitle,
  isOwner,
}: {
  workspaceId: string;
  workspaceTitle: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!isOwner) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          Bu bölüme yalnızca workspace&apos;in kurucusu erişebilir.
        </p>
      </div>
    );
  }

  function onDeleteWorkspace() {
    startTransition(async () => {
      try {
        await softDeleteWorkspaceAction(workspaceId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Workspace silinemedi");
        return;
      }

      router.push("/workspaces");

      function onUndo() {
        undoDeleteWorkspaceAction(workspaceId)
          .then(() => {
            toast.success("Workspace geri yüklendi");
            router.push(`/workspace/${workspaceId}`);
          })
          .catch((err) => {
            toast.error(err instanceof Error ? err.message : "Workspace geri yüklenemedi");
          });
      }

      toast(`'${workspaceTitle}' workspace'i silindi.`, {
        position: "bottom-center",
        duration: 30000,
        action: { label: "Geri Al", onClick: onUndo },
      });
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <div>
        <h2 className="text-sm font-semibold text-destructive">Tehlikeli Alan</h2>
        <p className="text-sm text-muted-foreground">
          Workspace&apos;e ait tüm kolonlar, fikirler, yorumlar ve bildirimler erişilemez hale
          gelir. Silme sonrası kısa bir süre geri alabilirsiniz.
        </p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button type="button" variant="destructive" size="sm" className="self-start">
              <Trash2Icon /> Workspace&apos;i Sil
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Workspace&apos;i Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Workspace&apos;e ait tüm kolonlar, fikirler, yorumlar ve bildirimler erişilemez
              hale gelir. Silme sonrası kısa bir süre geri alabilirsiniz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={onDeleteWorkspace}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
