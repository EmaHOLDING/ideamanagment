"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UsersIcon, CrownIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  getWorkspaceMembers,
  removeMember,
  transferOwnership,
  regenerateInviteCode,
  deleteWorkspaceAction,
} from "@/app/actions/workspaceActions";
import { getInitials } from "@/lib/user-display";

type Member = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];

export function MembersDialog({
  workspaceId,
  isOwner,
  currentUserId,
  inviteCode,
}: {
  workspaceId: string;
  isOwner: boolean;
  currentUserId: string;
  inviteCode: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [code, setCode] = useState(inviteCode);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    getWorkspaceMembers(workspaceId)
      .then((data) => {
        setMembers(data);
        setLoaded(true);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Üyeler yüklenemedi");
      });
  }, [open, workspaceId]);

  function refreshMembers() {
    getWorkspaceMembers(workspaceId).then(setMembers);
  }

  function onRemove(userId: string) {
    startTransition(async () => {
      try {
        await removeMember(workspaceId, userId);
        toast.success("Üye çıkarıldı");
        refreshMembers();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Üye çıkarılamadı");
      }
    });
  }

  function onTransfer(userId: string) {
    startTransition(async () => {
      try {
        await transferOwnership(workspaceId, userId);
        toast.success("Sahiplik devredildi");
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Sahiplik devredilemedi");
      }
    });
  }

  function onRegenerateCode() {
    startTransition(async () => {
      try {
        const updated = await regenerateInviteCode(workspaceId);
        setCode(updated.invite_code);
        toast.success("Davet kodu yenilendi");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Davet kodu yenilenemedi");
      }
    });
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <UsersIcon /> Üyeler
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Workspace Üyeleri</DialogTitle>
          <DialogDescription>
            Davet kodu: <span className="font-mono">{code}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {!loaded && <p className="text-sm text-muted-foreground">Yükleniyor...</p>}
          {loaded &&
            members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 rounded-md p-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback>{getInitials(m.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm">{m.fullName}</span>
                    {m.email && (
                      <span className="truncate text-xs text-muted-foreground">{m.email}</span>
                    )}
                  </div>
                  {m.role === "OWNER" && (
                    <Badge variant="outline" className="gap-1">
                      <CrownIcon className="size-3" /> Owner
                    </Badge>
                  )}
                </div>
                {isOwner && m.user_id !== currentUserId && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={isPending}
                      onClick={() => onTransfer(m.user_id)}
                    >
                      Sahipliği Devret
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={isPending}
                      onClick={() => onRemove(m.user_id)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                )}
              </div>
            ))}
        </div>

        {isOwner && (
          <>
            <Separator />
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={onRegenerateCode}
              >
                <RefreshCwIcon /> Davet Kodunu Yenile
              </Button>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button type="button" variant="destructive" size="sm">
                      <Trash2Icon /> Workspace&apos;i Sil
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Workspace&apos;i Sil</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bu işlem geri alınamaz. Workspace&apos;e ait tüm kolonlar, fikirler,
                      yorumlar ve bildirimler kalıcı olarak silinir.
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
