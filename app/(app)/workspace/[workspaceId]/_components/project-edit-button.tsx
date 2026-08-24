"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectDialog } from "./project-dialog";
import type { Database } from "@/lib/types/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

/** Proje detay sayfası (server component) için düzenleme tetikleyicisi —
 * formun kendisi Ayarlar'dakiyle aynı ProjectDialog, yeniden yazılmıyor. */
export function ProjectEditButton({ project }: { project: Project }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <PencilIcon /> Düzenle
      </Button>
      {open && (
        <ProjectDialog
          mode="edit"
          project={project}
          open={open}
          onOpenChange={setOpen}
          onUpdated={() => router.refresh()}
        />
      )}
    </>
  );
}
