"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ACCENT_CLASSES = [
  "bg-primary",
  "bg-pink-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-violet-500",
];

function accentClassFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return ACCENT_CLASSES[hash % ACCENT_CLASSES.length];
}

export function WorkspaceCard({
  id,
  title,
  inviteCode,
}: {
  id: string;
  title: string;
  inviteCode: string;
}) {
  const router = useRouter();

  function goToWorkspace() {
    router.push(`/workspace/${id}`);
  }

  function copyInviteLink(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(url);
    toast.success("Davet linki kopyalandı");
  }

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={goToWorkspace}
      onKeyDown={(e) => {
        if (e.key === "Enter") goToWorkspace();
      }}
      className="cursor-pointer overflow-hidden py-0 transition-shadow hover:shadow-md"
    >
      <div className={`h-1.5 w-full ${accentClassFor(id)}`} />
      <CardHeader className="pt-5">
        <CardTitle className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
            {title.charAt(0).toUpperCase()}
          </span>
          <span className="truncate">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2 pb-4">
        <span className="truncate text-xs text-muted-foreground">Davet kodu: {inviteCode}</span>
        <Button variant="outline" size="sm" onClick={copyInviteLink}>
          Linki Kopyala
        </Button>
      </CardContent>
    </Card>
  );
}
