"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowBigUpIcon } from "lucide-react";
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
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1 flex-1 text-sm">{version.title}</CardTitle>
          {canContribute ? (
            <Button
              type="button"
              variant={hasVoted ? "default" : "outline"}
              size="xs"
              disabled={isVotePending}
              onClick={onVoteClick}
              className="shrink-0 gap-1 px-1.5"
              title={`${voteCount} / ${members.length} kişi oy verdi`}
            >
              <ArrowBigUpIcon className="size-3.5" />
              {voteCount}/{members.length}
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
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <TiptapContentView content={version.content} clamp className="text-muted-foreground" />
        {ideaTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {ideaTags.map((tag) => (
              <Badge key={tag.id} variant="outline" className={tagColorClasses(tag.color).badgeClass}>
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline">Etki: {IMPACT_EFFORT_LABELS[version.impact_score ?? "MEDIUM"]}</Badge>
            <Badge variant="outline">Efor: {IMPACT_EFFORT_LABELS[version.effort_score ?? "MEDIUM"]}</Badge>
          </div>
          {assignee && (
            <Avatar size="sm" className="shrink-0" title={assignee.fullName}>
              <AvatarFallback>{getInitials(assignee.fullName)}</AvatarFallback>
            </Avatar>
          )}
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
