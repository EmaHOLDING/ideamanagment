"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TiptapContentView } from "@/components/editor/tiptap-content-view";
import { IMPACT_EFFORT_LABELS } from "@/lib/status";
import { IdeaDetailDialog } from "./idea-detail-dialog";
import type { Database } from "@/lib/types/database.types";

type IdeaVersion = Database["public"]["Tables"]["idea_versions"]["Row"];

export function IdeaCard({ version }: { version: IdeaVersion }) {
  const cardTrigger = (
    <Card
      size="sm"
      className="cursor-pointer border-border transition-all hover:border-primary/40 hover:shadow-md"
    >
      <CardHeader>
        <CardTitle className="line-clamp-1 text-sm">{version.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <TiptapContentView content={version.content} clamp className="text-muted-foreground" />
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline">Etki: {IMPACT_EFFORT_LABELS[version.impact_score ?? "MEDIUM"]}</Badge>
          <Badge variant="outline">Efor: {IMPACT_EFFORT_LABELS[version.effort_score ?? "MEDIUM"]}</Badge>
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
      trigger={cardTrigger}
    />
  );
}
