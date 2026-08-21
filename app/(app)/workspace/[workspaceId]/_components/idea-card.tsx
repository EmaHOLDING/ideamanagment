"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowBigUpIcon, LoaderCircleIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TiptapContentView } from "@/components/editor/tiptap-content-view";
import { toggleIdeaVote } from "@/app/actions/ideaActions";
import { IMPACT_EFFORT_LABELS, tagColorClasses } from "@/lib/status";
import { IdeaDetailDialog } from "./idea-detail-dialog";
import { getInitials } from "@/lib/user-display";
import type { getWorkspaceMembers } from "@/app/actions/workspaceActions";
import type { Database } from "@/lib/types/database.types";

type IdeaVersion = Database["public"]["Tables"]["idea_versions"]["Row"];
type Member = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];
type Tag = Database["public"]["Tables"]["tags"]["Row"];

export function IdeaCard({
  version,
  assigneeId,
  ideaTags,
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
  version: IdeaVersion;
  assigneeId: string | null;
  ideaTags: Tag[];
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
  const visibleTags = ideaTags.slice(0, 3);
  const hiddenTagCount = Math.max(ideaTags.length - visibleTags.length, 0);
  const displayedVoteCount = isVotePending
    ? Math.max(0, voteCount + (hasVoted ? -1 : 1))
    : voteCount;
  const displayedHasVoted = isVotePending ? !hasVoted : hasVoted;

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
      className="cursor-pointer border-border transition-all hover:border-primary/40 hover:shadow-md"
    >
      <CardHeader>
        <CardTitle
          className="line-clamp-2 min-w-0 [overflow-wrap:anywhere] text-sm leading-snug"
          title={version.title}
        >
          {version.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {version.content && (
          <TiptapContentView content={version.content} clamp className="text-muted-foreground" />
        )}
        {ideaTags.length > 0 && (
          <div className="flex min-w-0 flex-wrap gap-1" aria-label={`${ideaTags.length} etiket`}>
            {visibleTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                title={tag.name}
                className={`max-w-32 truncate ${tagColorClasses(tag.color).badgeClass}`}
              >
                {tag.name}
              </Badge>
            ))}
            {hiddenTagCount > 0 && (
              <Badge variant="secondary" title={`${hiddenTagCount} etiket daha`}>
                +{hiddenTagCount}
              </Badge>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 border-t pt-2.5">
          <div className="flex min-w-0 items-center gap-1.5 text-[0.7rem] text-muted-foreground">
            <span className="whitespace-nowrap">
              Etki <strong className="font-semibold text-foreground">{IMPACT_EFFORT_LABELS[version.impact_score ?? "MEDIUM"]}</strong>
            </span>
            <span aria-hidden className="text-border">•</span>
            <span className="whitespace-nowrap">
              Efor <strong className="font-semibold text-foreground">{IMPACT_EFFORT_LABELS[version.effort_score ?? "MEDIUM"]}</strong>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {assignee && (
              <Avatar size="sm" title={assignee.fullName}>
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
              className="shrink-0 gap-1 px-1.5"
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
              className="shrink-0 gap-1"
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
