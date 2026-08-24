"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowBigUpIcon, FolderKanbanIcon, LightbulbIcon, LoaderCircleIcon, MoveIcon, PencilIcon, SproutIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TiptapContentView } from "@/components/editor/tiptap-content-view";
import { toggleIdeaVote } from "@/app/actions/ideaActions";
import { IMPACT_EFFORT_LABELS, tagColorClasses } from "@/lib/status";
import { IdeaDetailDialog } from "./idea-detail-dialog";
import { getInitials } from "@/lib/user-display";
import { useIdeaPresence } from "@/lib/hooks/use-idea-presence";
import type { getWorkspaceMembers } from "@/app/actions/workspaceActions";
import type { Database } from "@/lib/types/database.types";

type IdeaVersion = Database["public"]["Tables"]["idea_versions"]["Row"];
type Member = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];
type Tag = Database["public"]["Tables"]["tags"]["Row"];
type Project = Database["public"]["Tables"]["projects"]["Row"];

export function IdeaCard({
  workspaceId,
  version,
  assigneeId,
  ideaTags,
  projectId,
  projects,
  voteCount,
  hasVoted,
  createdBy,
  commentCount,
  currentUserId,
  canManageContent,
  canContribute,
  members,
  availableTags,
  defaultOpen,
  hideIdea,
  showIdea,
}: {
  workspaceId: string;
  version: IdeaVersion;
  assigneeId: string | null;
  ideaTags: Tag[];
  projectId: string | null;
  projects: Project[];
  voteCount: number;
  hasVoted: boolean;
  createdBy: string;
  commentCount: number;
  currentUserId: string;
  canManageContent: boolean;
  canContribute: boolean;
  members: Member[];
  availableTags: Tag[];
  defaultOpen?: boolean;
  hideIdea: (ideaId: string) => void;
  showIdea: (ideaId: string) => void;
}) {
  const router = useRouter();
  const [isVotePending, startVoteTransition] = useTransition();
  const assignee = members.find((m) => m.user_id === assigneeId);
  const project = projects.find((p) => p.id === projectId) ?? null;
  const isOriginIdea = project?.origin_idea_id === version.idea_id;
  const visibleTags = ideaTags.slice(0, 3);
  const hiddenTagCount = Math.max(ideaTags.length - visibleTags.length, 0);
  const displayedVoteCount = isVotePending
    ? Math.max(0, voteCount + (hasVoted ? -1 : 1))
    : voteCount;
  const displayedHasVoted = isVotePending ? !hasVoted : hasVoted;
  const presence = useIdeaPresence(version.idea_id);
  const activePresence = presence.find((p) => p.action === "editing") ?? presence[0];

  function onVoteClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startVoteTransition(async () => {
      try {
        await toggleIdeaVote(version.idea_id);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Oylama işlemi başarısız oldu");
      }
    });
  }

  const cardTrigger = (
    <Card
      size="sm"
      className="relative isolate cursor-pointer bg-gradient-to-br from-card via-card to-primary/[0.035] shadow-[0_1px_0_rgb(255_255_255/0.025)_inset] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/15 hover:ring-primary/35"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-80"
      />
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle
            className="line-clamp-2 min-w-0 flex-1 [overflow-wrap:anywhere] text-sm leading-snug font-semibold tracking-[-0.01em]"
            title={version.title}
          >
            {version.title}
          </CardTitle>
          {activePresence && (
            <div
              title={
                activePresence.action === "editing"
                  ? `${activePresence.fullName} bu fikri düzenliyor`
                  : `${activePresence.fullName} bu fikri taşıyor`
              }
              className="flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.65rem] font-medium text-primary"
            >
              {activePresence.action === "editing" ? (
                <PencilIcon className="size-3" />
              ) : (
                <MoveIcon className="size-3" />
              )}
              <span className="max-w-16 truncate">{activePresence.fullName}</span>
              {presence.length > 1 && <span>+{presence.length - 1}</span>}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {version.content && (
          <div className="rounded-lg border border-border/50 bg-background/35 px-2.5 py-2 shadow-[0_1px_0_rgb(255_255_255/0.02)_inset]">
            <TiptapContentView
              content={version.content}
              clamp
              className="text-xs leading-relaxed text-muted-foreground"
            />
          </div>
        )}
        <div className="flex min-w-0 flex-wrap gap-1" aria-label={`${ideaTags.length} etiket`}>
            {project ? (
              <Badge
                variant="secondary"
                className="h-5 gap-1 rounded-md border-0 bg-primary/10 px-2 text-[0.66rem] font-medium text-primary"
                title={
                  isOriginIdea
                    ? `${project.name} projesinin çıkış fikri`
                    : `${project.name} projesine bağlı`
                }
              >
                {isOriginIdea ? (
                  <SproutIcon className="size-3" />
                ) : (
                  <FolderKanbanIcon className="size-3" />
                )}
                <span className="max-w-28 truncate">{project.name}</span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="h-5 gap-1 rounded-md px-2 text-[0.66rem] font-medium text-muted-foreground"
              >
                <LightbulbIcon className="size-3" />
                Proje Fikri
              </Badge>
            )}
            {visibleTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                title={tag.name}
                className={`h-5 max-w-36 gap-1.5 rounded-md border-0 px-2 text-[0.66rem] font-medium shadow-[0_0_0_1px_rgb(255_255_255/0.035)_inset] ${tagColorClasses(tag.color).softClass}`}
              >
                <span
                  aria-hidden
                  className={`size-1.5 shrink-0 rounded-full ${tagColorClasses(tag.color).dotClass}`}
                />
                <span className="truncate">{tag.name}</span>
              </Badge>
            ))}
            {hiddenTagCount > 0 && (
              <Badge variant="secondary" title={`${hiddenTagCount} etiket daha`}>
                +{hiddenTagCount}
              </Badge>
            )}
        </div>
        <div className="-mx-3 -mb-3 mt-0.5 flex items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex flex-col">
              <span className="text-[0.58rem] leading-none font-medium tracking-[0.08em] text-muted-foreground/60 uppercase">
                Etki
              </span>
              <strong className="mt-1 text-[0.7rem] leading-none font-semibold text-foreground/90">
                {IMPACT_EFFORT_LABELS[version.impact_score ?? "MEDIUM"]}
              </strong>
            </span>
            <span aria-hidden className="h-5 w-px bg-border/70" />
            <span className="flex flex-col">
              <span className="text-[0.58rem] leading-none font-medium tracking-[0.08em] text-muted-foreground/60 uppercase">
                Efor
              </span>
              <strong className="mt-1 text-[0.7rem] leading-none font-semibold text-foreground/90">
                {IMPACT_EFFORT_LABELS[version.effort_score ?? "MEDIUM"]}
              </strong>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {assignee && (
              <Avatar size="sm" className="ring-1 ring-border" title={assignee.fullName}>
                <AvatarFallback>{getInitials(assignee.fullName)}</AvatarFallback>
              </Avatar>
            )}
          {canContribute ? (
            <Button
              type="button"
              variant={displayedHasVoted ? "default" : "outline"}
              size="xs"
              disabled={isVotePending}
              onClick={onVoteClick}
              className="h-7 shrink-0 gap-1 rounded-full px-2 shadow-sm"
              title={isVotePending ? "Oy güncelleniyor" : `${voteCount} / ${members.length} kişi oy verdi`}
              aria-label={isVotePending ? "Oy güncelleniyor" : `${voteCount} / ${members.length} kişi oy verdi`}
            >
              {isVotePending ? (
                <LoaderCircleIcon className="size-3.5 animate-spin" />
              ) : (
                <ArrowBigUpIcon className="size-3.5" />
              )}
              <span className="tabular-nums">{displayedVoteCount}/{members.length}</span>
            </Button>
          ) : (
            <Badge
              variant="outline"
              className="h-7 shrink-0 gap-1 rounded-full bg-background/60 px-2"
              title={`${voteCount} / ${members.length} kişi oy verdi`}
            >
              <ArrowBigUpIcon className="size-3.5" />
              {voteCount}/{members.length}
            </Badge>
          )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <IdeaDetailDialog
      workspaceId={workspaceId}
      ideaId={version.idea_id}
      data={{
        title: version.title,
        content: version.content,
        problemStatement: version.problem_statement,
        targetAudience: version.target_audience,
        impactScore: version.impact_score ?? "MEDIUM",
        effortScore: version.effort_score ?? "MEDIUM",
      }}
      assigneeId={assigneeId}
      ideaTags={ideaTags}
      projectId={projectId}
      projects={projects}
      createdBy={createdBy}
      initialCommentCount={commentCount}
      currentUserId={currentUserId}
      canManageContent={canManageContent}
      canContribute={canContribute}
      members={members}
      availableTags={availableTags}
      defaultOpen={defaultOpen}
      hideIdea={hideIdea}
      showIdea={showIdea}
      trigger={cardTrigger}
    />
  );
}
