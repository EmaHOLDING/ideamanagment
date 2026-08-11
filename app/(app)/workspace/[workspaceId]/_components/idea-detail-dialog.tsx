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
  ChevronDownIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import {
  assignIdea,
  softDeleteIdea,
  undoDeleteIdea,
  type IdeaVersionData,
} from "@/app/actions/ideaActions";
import { setIdeaTags } from "@/app/actions/tagActions";
import { IMPACT_EFFORT_LABELS } from "@/lib/status";
import { IdeaDialog } from "./idea-dialog";
import { VersionHistoryDialog } from "./version-history-dialog";
import { CommentsPanel } from "./comments-panel";
import { TagPicker } from "./tag-picker";
import { IdeaAttachmentsSection } from "./idea-attachments-section";
import type { getWorkspaceMembers } from "@/app/actions/workspaceActions";
import type { Database } from "@/lib/types/database.types";

type Member = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];
type Tag = Database["public"]["Tables"]["tags"]["Row"];

const UNASSIGNED = "unassigned";

export function IdeaDetailDialog({
  ideaId,
  data,
  assigneeId,
  ideaTags,
  createdBy,
  currentUserId,
  canManageContent,
  canContribute,
  members,
  availableTags,
  defaultOpen,
  trigger,
  hideIdea,
  showIdea,
}: {
  ideaId: string;
  data: IdeaVersionData;
  assigneeId: string | null;
  ideaTags: Tag[];
  createdBy: string;
  currentUserId: string;
  canManageContent: boolean;
  canContribute: boolean;
  members: Member[];
  availableTags: Tag[];
  defaultOpen?: boolean;
  trigger: ReactElement;
  hideIdea: (ideaId: string) => void;
  showIdea: (ideaId: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const canEditIdea = createdBy === currentUserId || canManageContent;
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 640
  );
  const [isAssignPending, startAssignTransition] = useTransition();
  const [, startTagTransition] = useTransition();

  function onConfirmDelete() {
    setDeleteOpen(false);
    onOpenChange(false);
    hideIdea(ideaId);

    function onUndo() {
      showIdea(ideaId);
      undoDeleteIdea(ideaId)
        .then(() => router.refresh())
        .catch((err) => {
          hideIdea(ideaId);
          toast.error(err instanceof Error ? err.message : "Fikir geri yüklenemedi");
        });
    }

    toast("Fikir silindi.", {
      position: "bottom-center",
      duration: 30000,
      action: { label: "Geri Al", onClick: onUndo },
    });

    softDeleteIdea(ideaId).catch((err) => {
      showIdea(ideaId);
      toast.error(err instanceof Error ? err.message : "Fikir silinemedi");
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
          <DialogHeader className="flex-col items-start justify-between gap-3 border-b bg-muted/30 px-5 py-4 sm:flex-row">
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
                  disabled={isAssignPending || !canContribute}
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
                {canContribute ? (
                  <TagPicker
                    availableTags={availableTags}
                    selectedTagIds={ideaTags.map((t) => t.id)}
                    onChange={onTagsChange}
                  />
                ) : (
                  ideaTags.map((tag) => (
                    <Badge key={tag.id} variant="outline">
                      {tag.name}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 sm:pr-9">
              <Button type="button" variant="ghost" size="sm" onClick={onCopyLink}>
                <LinkIcon /> <span className="hidden sm:inline">Link Kopyala</span>
              </Button>
              <VersionHistoryDialog
                ideaId={ideaId}
                trigger={
                  <Button type="button" variant="ghost" size="sm">
                    <HistoryIcon /> <span className="hidden sm:inline">Geçmiş</span>
                  </Button>
                }
              />
              {canEditIdea && (
                <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <PencilIcon /> <span className="hidden sm:inline">Düzenle</span>
                </Button>
              )}
              {canEditIdea && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2Icon /> <span className="hidden sm:inline">Sil</span>
                </Button>
              )}
            </div>
          </DialogHeader>

          <div
            className={cn(
              "grid min-h-0 grid-cols-1 overflow-hidden sm:grid-rows-1",
              commentsOpen
                ? "grid-rows-[40vh_1fr] sm:grid-cols-[280px_1fr]"
                : "grid-rows-[auto_1fr] sm:grid-cols-[auto_1fr]"
            )}
          >
            <div className="flex min-h-0 flex-col border-b bg-muted/20 sm:border-r sm:border-b-0">
              <button
                type="button"
                onClick={() => setCommentsOpen((v) => !v)}
                className="flex items-center gap-1.5 border-b px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground"
              >
                <MessageSquareIcon className="size-3.5" /> Yorumlar
                <ChevronDownIcon
                  className={cn(
                    "ml-auto size-3.5 shrink-0 transition-transform",
                    !commentsOpen && "-rotate-90"
                  )}
                />
              </button>
              {commentsOpen && (
                <ScrollArea className="min-h-0 flex-1">
                  <div className="p-4">
                    <CommentsPanel
                      ideaId={ideaId}
                      members={members}
                      currentUserId={currentUserId}
                      canManageContent={canManageContent}
                      canContribute={canContribute}
                      showHeading={false}
                    />
                  </div>
                </ScrollArea>
              )}
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

                <IdeaAttachmentsSection
                  ideaId={ideaId}
                  currentUserId={currentUserId}
                  canContribute={canContribute}
                  canManageContent={canManageContent}
                />
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
              &quot;{data.title}&quot; fikrini silmek istediğinize emin misiniz? Silme sonrası
              kısa bir süre geri alabilirsiniz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onConfirmDelete}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
