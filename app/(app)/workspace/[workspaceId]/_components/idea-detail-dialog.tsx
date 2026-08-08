"use client";

import { useState, useTransition, type ReactElement } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  PencilIcon,
  Trash2Icon,
  HistoryIcon,
  TargetIcon,
  MessageSquareIcon,
  UserIcon,
  LinkIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TiptapContentView } from "@/components/editor/tiptap-content-view";
import { assignIdea, deleteIdea, type IdeaVersionData } from "@/app/actions/ideaActions";
import { setIdeaTags } from "@/app/actions/tagActions";
import { IMPACT_EFFORT_LABELS } from "@/lib/status";
import { IdeaDialog } from "./idea-dialog";
import { VersionHistoryDialog } from "./version-history-dialog";
import { CommentsPanel } from "./comments-panel";
import { TagPicker } from "./tag-picker";
import type { getWorkspaceMembers } from "@/app/actions/workspaceActions";
import type { Database } from "@/lib/types/database.types";

type Member = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];
type Tag = Database["public"]["Tables"]["tags"]["Row"];

const UNASSIGNED = "unassigned";

export function IdeaDetailDialog({
  workspaceId,
  ideaId,
  data,
  assigneeId,
  ideaTags,
  members,
  availableTags,
  defaultOpen,
  trigger,
}: {
  workspaceId: string;
  ideaId: string;
  data: IdeaVersionData;
  assigneeId: string | null;
  ideaTags: Tag[];
  members: Member[];
  availableTags: Tag[];
  defaultOpen?: boolean;
  trigger: ReactElement;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isAssignPending, startAssignTransition] = useTransition();
  const [, startTagTransition] = useTransition();

  function onConfirmDelete() {
    startDeleteTransition(async () => {
      try {
        await deleteIdea(ideaId);
        toast.success("Fikir silindi");
        setDeleteOpen(false);
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Fikir silinemedi");
      }
    });
  }

  function onAssigneeChange(value: string | null) {
    const nextAssigneeId = !value || value === UNASSIGNED ? null : value;
    startAssignTransition(async () => {
      try {
        await assignIdea(ideaId, nextAssigneeId);
        toast.success("Atanan kişi güncellendi");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Atama güncellenemedi");
      }
    });
  }

  function onTagsChange(tagIds: string[]) {
    startTagTransition(async () => {
      try {
        await setIdeaTags(ideaId, tagIds);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Etiketler güncellenemedi");
      }
    });
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    router.replace(next ? `${pathname}?idea=${ideaId}` : pathname, { scroll: false });
  }

  async function onCopyLink() {
    const url = `${window.location.origin}${pathname}?idea=${ideaId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link kopyalandı");
    } catch {
      toast.error("Link kopyalanamadı");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger render={trigger} nativeButton={false} />
        <DialogContent
          showCloseButton
          className="grid h-[85vh] max-h-[85vh] w-full grid-rows-[auto_1fr] gap-0 overflow-hidden p-0 sm:max-w-4xl"
        >
          <DialogHeader className="flex-row items-start justify-between gap-4 border-b bg-muted/30 px-5 py-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <DialogTitle className="text-lg leading-snug break-words pr-1">
                {data.title}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">Etki: {IMPACT_EFFORT_LABELS[data.impactScore ?? "MEDIUM"]}</Badge>
                <Badge variant="outline">Efor: {IMPACT_EFFORT_LABELS[data.effortScore ?? "MEDIUM"]}</Badge>
                <Select
                  value={assigneeId ?? UNASSIGNED}
                  onValueChange={onAssigneeChange}
                  disabled={isAssignPending}
                >
                  <SelectTrigger size="sm" className="h-6 w-auto gap-1 text-xs">
                    <UserIcon className="size-3" />
                    <SelectValue>
                      {() => {
                        const assignee = members.find((m) => m.user_id === assigneeId);
                        return assignee?.fullName ?? "Atanmadı";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Atanmadı</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <TagPicker
                  workspaceId={workspaceId}
                  availableTags={availableTags}
                  selectedTagIds={ideaTags.map((t) => t.id)}
                  onChange={onTagsChange}
                />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 pr-9">
              <Button type="button" variant="ghost" size="sm" onClick={onCopyLink}>
                <LinkIcon /> Link Kopyala
              </Button>
              <VersionHistoryDialog
                ideaId={ideaId}
                trigger={
                  <Button type="button" variant="ghost" size="sm">
                    <HistoryIcon /> Geçmiş
                  </Button>
                }
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <PencilIcon /> Düzenle
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2Icon /> Sil
              </Button>
            </div>
          </DialogHeader>

          <div className="grid min-h-0 grid-cols-[280px_1fr] overflow-hidden">
            <div className="flex min-h-0 flex-col border-r bg-muted/20">
              <div className="flex items-center gap-1.5 border-b px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <MessageSquareIcon className="size-3.5" /> Yorumlar
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="p-4">
                  <CommentsPanel ideaId={ideaId} members={members} showHeading={false} />
                </div>
              </ScrollArea>
            </div>

            <ScrollArea className="min-h-0">
              <div className="flex flex-col gap-6 p-6">
                {data.problemStatement && (
                  <section className="flex flex-col gap-1.5">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Problem Tanımı
                    </h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                      {data.problemStatement}
                    </p>
                  </section>
                )}

                {data.targetAudience && (
                  <section className="flex flex-col gap-1.5">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <TargetIcon className="size-3.5" /> Hedef Kitle
                    </h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                      {data.targetAudience}
                    </p>
                  </section>
                )}

                <section className="flex flex-col gap-1.5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    İçerik
                  </h3>
                  <div className="rounded-lg border bg-card p-4">
                    <TiptapContentView content={data.content} />
                  </div>
                </section>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <IdeaDialog
        mode="edit"
        ideaId={ideaId}
        initial={data}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fikri Sil</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{data.title}&quot; fikrini ve tüm versiyon/yorum geçmişini silmek istediğinize
              emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={onConfirmDelete}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
