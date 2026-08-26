"use client";

import { useEffect, useState, useTransition, type ReactElement } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  PencilIcon,
  Trash2Icon,
  HistoryIcon,
  TargetIcon,
  MessageSquareIcon,
  UserIcon,
  FolderKanbanIcon,
  SproutIcon,
  LinkIcon,
  ChevronDownIcon,
  ArchiveIcon,
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
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TiptapContentView } from "@/components/editor/tiptap-content-view";
import {
  assignIdea,
  softDeleteIdea,
  undoDeleteIdea,
  archiveIdea,
  type IdeaVersionData,
} from "@/app/actions/ideaActions";
import { setIdeaTags } from "@/app/actions/tagActions";
import { convertIdeaToProject } from "@/app/actions/projectActions";
import { IMPACT_EFFORT_LABELS } from "@/lib/status";
import { FEATURES } from "@/lib/features";
import { useIdeaPresence, useIdeaPresenceActions } from "@/lib/hooks/use-idea-presence";
import { IdeaDialog } from "./idea-dialog";
import { VersionHistoryDialog } from "./version-history-dialog";
import { CommentsPanel } from "./comments-panel";
import { TagPicker } from "./tag-picker";
import { IdeaAttachmentsSection } from "./idea-attachments-section";
import type { getWorkspaceMembers } from "@/app/actions/workspaceActions";
import type { Database } from "@/lib/types/database.types";

type Member = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];
type Tag = Database["public"]["Tables"]["tags"]["Row"];
type Project = Database["public"]["Tables"]["projects"]["Row"];

const UNASSIGNED = "unassigned";

export function IdeaDetailDialog({
  workspaceId,
  ideaId,
  data,
  assigneeId,
  ideaTags,
  projectId,
  projects,
  createdBy,
  initialCommentCount,
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
  workspaceId: string;
  ideaId: string;
  data: IdeaVersionData;
  assigneeId: string | null;
  ideaTags: Tag[];
  projectId: string | null;
  projects: Project[];
  createdBy: string;
  initialCommentCount: number;
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
  const [isConvertPending, startConvertTransition] = useTransition();
  const project = projects.find((p) => p.id === projectId) ?? null;
  const isOriginIdea = project?.origin_idea_id === ideaId;
  const effectiveProblemStatement = data.problemStatement || project?.problem_statement || null;
  const effectiveTargetAudience = data.targetAudience || project?.target_audience || null;
  const usesProjectProblemStatement = !data.problemStatement && Boolean(project?.problem_statement);
  const usesProjectTargetAudience = !data.targetAudience && Boolean(project?.target_audience);
  // Bildirim/direkt link tıklamaları client-side navigasyonla aynı sayfaya
  // sadece ?idea= query'sini değiştirerek gelir — board/column/card ağacı
  // yeniden mount olmadığı için useState'in ilk mount değeri güncellenmez.
  // defaultOpen prop'u değiştiğinde (react-hooks/set-state-in-effect'i
  // tetiklememek için useEffect yerine render sırasında "prop değişti mi"
  // karşılaştırmasıyla) dialog'u burada açık zorluyoruz.
  const [prevDefaultOpen, setPrevDefaultOpen] = useState(defaultOpen);
  if (defaultOpen !== prevDefaultOpen) {
    setPrevDefaultOpen(defaultOpen);
    if (defaultOpen) setOpen(true);
  }
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 640
  );
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [isAssignPending, startAssignTransition] = useTransition();
  const [, startTagTransition] = useTransition();
  const presence = useIdeaPresence(ideaId);
  const editors = presence.filter((p) => p.action === "editing");
  const { setEditing } = useIdeaPresenceActions();

  useEffect(() => {
    setEditing(editOpen ? ideaId : null);
    return () => setEditing(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOpen, ideaId]);

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

  function onConvertToProject() {
    setConvertOpen(false);
    startConvertTransition(async () => {
      try {
        const created = await convertIdeaToProject(ideaId);
        toast.success(`'${created.name}' projesi oluşturuldu.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Fikir projeye dönüştürülemedi");
      }
    });
  }

  function onConfirmArchive() {
    setArchiveOpen(false);
    onOpenChange(false);
    hideIdea(ideaId);
    archiveIdea(ideaId)
      .then(() => {
        toast.success("Fikir arşivlendi");
        router.refresh();
      })
      .catch((err) => {
        showIdea(ideaId);
        toast.error(err instanceof Error ? err.message : "Fikir arşivlenemedi");
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
          className="grid h-[85dvh] max-h-[85dvh] w-full grid-rows-[auto_1fr] gap-0 overflow-hidden p-0 sm:max-w-4xl"
        >
          <DialogHeader className="min-w-0 flex-col items-start justify-between gap-3 overflow-hidden border-b bg-muted/30 px-5 py-4 pr-12 sm:flex-row">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <DialogTitle
                title={data.title}
                className="line-clamp-2 max-w-full min-w-0 text-lg leading-snug [overflow-wrap:anywhere]"
              >
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
                {project ? (
                  <Link
                    href={`/workspace/${workspaceId}/project/${project.id}`}
                    title={
                      isOriginIdea
                        ? `Bu fikirden doğan proje: ${project.name}`
                        : `Bağlı olduğu proje: ${project.name}`
                    }
                  >
                    <Badge
                      variant="outline"
                      className="gap-1 border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                    >
                      {isOriginIdea ? (
                        <SproutIcon className="size-3" />
                      ) : (
                        <FolderKanbanIcon className="size-3" />
                      )}
                      {project.name}
                    </Badge>
                  </Link>
                ) : (
                  <Badge variant="outline" className="gap-1" title="Bu fikir bir projeye bağlı değil">
                    <FolderKanbanIcon className="size-3" />
                    Bağımsız
                  </Badge>
                )}
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
                {editors.length > 0 && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-primary/30 bg-primary/10 text-primary"
                    title={editors.map((e) => e.fullName).join(", ")}
                  >
                    <PencilIcon className="size-3" />
                    {editors[0].fullName}
                    {editors.length > 1 ? ` +${editors.length - 1}` : ""} düzenliyor
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex max-w-full shrink-0 flex-wrap items-center gap-1 sm:gap-1.5">
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
              {canContribute && !project && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isConvertPending}
                  onClick={() => setConvertOpen(true)}
                  title="Bu fikri, altına başka fikirlerin bağlanabileceği bir projeye dönüştür"
                >
                  <SproutIcon /> <span className="hidden sm:inline">Projeye Dönüştür</span>
                </Button>
              )}
              {canEditIdea && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setArchiveOpen(true)}
                >
                  <ArchiveIcon /> <span className="hidden sm:inline">Arşivle</span>
                </Button>
              )}
              {canEditIdea && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (editors.length > 0) {
                      toast.warning(
                        `${editors[0].fullName} şu an bu fikri düzenliyor. Aynı anda kaydederseniz birinizin değişikliği kaybolabilir.`
                      );
                    }
                    setEditOpen(true);
                  }}
                >
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
              "grid min-h-0 min-w-0 grid-cols-1 overflow-hidden sm:grid-rows-1",
              commentsOpen
                ? "grid-rows-[40vh_1fr] sm:grid-cols-[280px_1fr]"
                : "grid-rows-[auto_1fr] sm:grid-cols-[auto_1fr]"
            )}
          >
            <div className="flex min-h-0 min-w-0 flex-col border-b bg-muted/20 sm:border-r sm:border-b-0">
              <button
                type="button"
                onClick={() => setCommentsOpen((v) => !v)}
                className="flex items-center gap-1.5 border-b px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground"
              >
                <MessageSquareIcon className="size-3.5" /> Yorumlar
                {commentCount > 0 && (
                  <Badge variant="secondary" className="h-4.5 min-w-4.5 justify-center px-1 text-[0.65rem] tabular-nums">
                    {commentCount}
                  </Badge>
                )}
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
                      onCommentCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))}
                    />
                  </div>
                </ScrollArea>
              )}
            </div>

            <ScrollArea className="min-h-0 min-w-0">
              <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
                {effectiveProblemStatement && (
                  <section className="flex flex-col gap-1.5">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Problem Tanımı
                      {usesProjectProblemStatement && (
                        <Badge variant="outline" className="h-4.5 px-1.5 text-[0.6rem] font-normal normal-case">
                          {project?.name}&apos;den
                        </Badge>
                      )}
                    </h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">
                      {effectiveProblemStatement}
                    </p>
                  </section>
                )}

                {effectiveTargetAudience && (
                  <section className="flex flex-col gap-1.5">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <TargetIcon className="size-3.5" /> Hedef Kitle
                      {usesProjectTargetAudience && (
                        <Badge variant="outline" className="h-4.5 px-1.5 text-[0.6rem] font-normal normal-case">
                          {project?.name}&apos;den
                        </Badge>
                      )}
                    </h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">
                      {effectiveTargetAudience}
                    </p>
                  </section>
                )}

                <section className="flex flex-col gap-1.5">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    İçerik
                  </h3>
                  <div className="min-w-0 overflow-hidden rounded-lg border bg-card p-4">
                    <TiptapContentView content={data.content} />
                  </div>
                </section>

                {FEATURES.attachments && (
                  <IdeaAttachmentsSection
                    ideaId={ideaId}
                    currentUserId={currentUserId}
                    canContribute={canContribute}
                    canManageContent={canManageContent}
                  />
                )}
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
        projects={projects}
        initialProjectId={projectId}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia className="rounded-full bg-destructive/10 text-destructive ring-1 ring-destructive/15">
              <Trash2Icon className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>Bu fikri silmek istiyor musunuz?</AlertDialogTitle>
            <AlertDialogDescription className="flex flex-col gap-2 text-left">
              <span className="line-clamp-2 rounded-lg border border-border/70 bg-muted/50 px-3 py-2 font-medium text-foreground" title={data.title}>
                {data.title}
              </span>
              <span>
                Fikir panodan kaldırılacak. İşlemden sonra kısa bir süre boyunca geri alabilirsiniz.
              </span>
              {isOriginIdea && (
                <span>
                  Bu fikir <strong className="text-foreground">{project?.name}</strong> projesinin
                  çıkış fikri. Proje ve ona bağlı diğer fikirler silinmez, yalnızca bu fikir
                  kaldırılır.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="bg-destructive text-white hover:bg-destructive/90 dark:text-white"
              onClick={onConfirmDelete}
            >
              <Trash2Icon /> Fikri Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={convertOpen} onOpenChange={setConvertOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia className="rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
              <SproutIcon className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>Bu fikri projeye dönüştürelim mi?</AlertDialogTitle>
            <AlertDialogDescription className="flex flex-col gap-2 text-left">
              <span className="line-clamp-2 rounded-lg border bg-muted/50 px-3 py-2 font-medium text-foreground">
                {data.title}
              </span>
              <span>
                Fikrin başlığı ve açıklamasıyla yeni bir proje oluşturulacak. Fikir panoda kalacak
                ve yeni projenin ilk fikri olarak bağlanacak.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction disabled={isConvertPending} onClick={onConvertToProject}>
              <SproutIcon /> Projeye Dönüştür
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia className="rounded-full bg-muted text-muted-foreground">
              <ArchiveIcon className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>Fikri arşivleyelim mi?</AlertDialogTitle>
            <AlertDialogDescription>
              Fikir Kanban panosundan kaldırılır; Arşiv ekranından daha sonra geri yüklenebilir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmArchive}>Arşivle</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
