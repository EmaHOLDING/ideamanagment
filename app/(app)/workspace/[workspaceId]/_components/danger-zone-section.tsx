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
import { deleteWorkspaceAction } from "@/app/actions/workspaceActions";

export function DangerZoneSection({
  workspaceId,
  isOwner,
}: {
  workspaceId: string;
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
        await deleteWorkspaceAction(workspaceId);
        toast.success("Workspace silindi");
        router.push("/workspaces");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Workspace silinemedi");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <div>
        <h2 className="text-sm font-semibold text-destructive">Tehlikeli Alan</h2>
        <p className="text-sm text-muted-foreground">
          Bu işlem geri alınamaz. Workspace&apos;e ait tüm kolonlar, fikirler, yorumlar ve
          bildirimler kalıcı olarak silinir.
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
              Bu işlem geri alınamaz. Workspace&apos;e ait tüm kolonlar, fikirler, yorumlar ve
              bildirimler kalıcı olarak silinir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={onDeleteWorkspace}>
              Kalıcı Olarak Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
