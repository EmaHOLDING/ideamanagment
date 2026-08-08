"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WorkspaceCard({
  id,
  title,
  inviteCode,
}: {
  id: string;
  title: string;
  inviteCode: string;
}) {
  function copyInviteLink() {
    const url = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(url);
    toast.success("Davet linki kopyalandı");
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
            {title.charAt(0).toUpperCase()}
          </span>
          <Link href={`/workspace/${id}`} className="truncate hover:underline">
            {title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground">Davet kodu: {inviteCode}</span>
        <Button variant="outline" size="sm" onClick={copyInviteLink}>
          Linki Kopyala
        </Button>
      </CardContent>
    </Card>
  );
}
