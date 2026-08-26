"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArchiveIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { archiveProject } from "@/app/actions/projectActions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ProjectArchiveButton({ workspaceId, projectId, projectName, ideaCount = 0 }: {
  workspaceId: string;
  projectId: string;
  projectName: string;
  ideaCount?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      try {
        await archiveProject(projectId);
        toast.success("Proje arşivlendi");
        setOpen(false);
        router.push(`/workspace/${workspaceId}/archive`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Proje arşivlenemedi");
      }
    });
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <ArchiveIcon /> Arşivle
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>&apos;{projectName}&apos; arşivlensin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              Proje ve ona bağlı {ideaCount} aktif fikir birlikte arşivlenir; hiçbir veri silinmez.
              Projeyi geri yüklediğinizde bu işlemle arşivlenen fikirler de geri gelir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={onConfirm}>
              {pending && <LoaderCircleIcon className="animate-spin" />} Arşivle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
