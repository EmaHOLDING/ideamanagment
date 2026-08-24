"use client";

import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectDialog } from "./project-dialog";

/** Projeler sayfasındaki "Yeni Proje" tetikleyicisi. Tüm katkıda bulunan
 * üyelere açıktır (Ayarlar'ın aksine yönetici kilidi yok). */
export function ProjectCreateButton({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();

  return (
    <ProjectDialog
      mode="create"
      workspaceId={workspaceId}
      onCreated={() => router.refresh()}
      trigger={
        <Button type="button">
          <PlusIcon /> Yeni Proje
        </Button>
      }
    />
  );
}
