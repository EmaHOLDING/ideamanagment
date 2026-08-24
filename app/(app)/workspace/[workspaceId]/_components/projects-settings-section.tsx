"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderKanbanIcon, LoaderCircleIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  getProjectIdeaCount,
  softDeleteProject,
  undoDeleteProject,
} from "@/app/actions/projectActions";
import { ProjectDialog } from "./project-dialog";
import { TiptapContentView } from "@/components/editor/tiptap-content-view";
import type { Database } from "@/lib/types/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

export function ProjectsSettingsSection({
  workspaceId,
  initialProjects,
}: {
  workspaceId: string;
  initialProjects: Project[];
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ project: Project; ideaCount: number | null } | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  function onUpdated(project: Project) {
    setProjects((prev) => prev.map((p) => (p.id === project.id ? project : p)));
    router.refresh();
  }

  function onOpenDeleteDialog(project: Project) {
    setDeleteTarget({ project, ideaCount: null });
    getProjectIdeaCount(project.id)
      .then((count) => setDeleteTarget({ project, ideaCount: count }))
      .catch(() => setDeleteTarget({ project, ideaCount: 0 }));
  }

  function onConfirmDelete() {
    if (!deleteTarget) return;
    const { project } = deleteTarget;
    setIsDeleting(true);

    softDeleteProject(project.id)
      .then(({ cascadedIdeaIds }) => {
        const index = projects.findIndex((p) => p.id === project.id);
        setProjects((prev) => prev.filter((p) => p.id !== project.id));
        setDeleteTarget(null);
        router.refresh();

        function onUndo() {
          setProjects((prev) => {
            const next = prev.slice();
            next.splice(index, 0, project);
            return next;
          });
          undoDeleteProject(project.id, cascadedIdeaIds)
            .then(() => router.refresh())
            .catch((err) => {
              setProjects((prev) => prev.filter((p) => p.id !== project.id));
              toast.error(err instanceof Error ? err.message : "Proje geri yüklenemedi");
            });
        }

        toast(
          cascadedIdeaIds.length > 0
            ? `Proje ve ${cascadedIdeaIds.length} bağlı fikir silindi.`
            : "Proje silindi.",
          {
            position: "bottom-center",
            duration: 30000,
            action: { label: "Geri Al", onClick: onUndo },
          }
        );
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Proje silinemedi");
      })
      .finally(() => setIsDeleting(false));
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderKanbanIcon className="size-4" />
          </span>
          <div>
            <h2 className="font-semibold">Projeler</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Birden fazla fikri bir girişim altında toplayın; fikirler projenin problem/hedef
              kitle tanımını varsayılan olarak miras alır.
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
          {projects.length} proje
        </span>
      </div>

      <div>
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex flex-col gap-2 border-b px-5 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{project.name}</p>
              {project.description && (
                <TiptapContentView
                  content={project.description}
                  clamp
                  className="mt-0.5 text-sm text-muted-foreground"
                />
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${project.name} projesini düzenle`}
                onClick={() => setEditingProject(project)}
              >
                <PencilIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={`${project.name} projesini sil`}
                onClick={() => onOpenDeleteDialog(project)}
              >
                <Trash2Icon />
              </Button>
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Henüz proje yok. İlk projeyi aşağıdan ekleyebilirsiniz.
          </p>
        )}
      </div>

      <div className="border-t bg-muted/20 px-4 py-3.5 sm:px-5">
        <p className="text-sm text-muted-foreground">
          Yeni proje oluşturmak için{" "}
          <Link
            href={`/workspace/${workspaceId}/projects`}
            className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
          >
            Projeler
          </Link>{" "}
          sayfasını kullanın. Burası yeniden adlandırma ve silme gibi yönetim işlemleri içindir.
        </p>
      </div>

      {editingProject && (
        <ProjectDialog
          mode="edit"
          project={editingProject}
          open={editingProject !== null}
          onOpenChange={(open) => !open && setEditingProject(null)}
          onUpdated={onUpdated}
        />
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projeyi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  &apos;{deleteTarget.project.name}&apos; projesini silmek istediğinize emin
                  misiniz?{" "}
                  {deleteTarget.ideaCount === null ? (
                    <span className="inline-flex items-center gap-1 align-middle">
                      <LoaderCircleIcon className="size-3 animate-spin" /> bağlı fikirler
                      kontrol ediliyor…
                    </span>
                  ) : deleteTarget.ideaCount > 0 ? (
                    <strong className="text-foreground">
                      Bu projeye bağlı {deleteTarget.ideaCount} fikir de silinecek.
                    </strong>
                  ) : (
                    "Bu projeye bağlı fikir yok."
                  )}{" "}
                  Silme sonrası kısa bir süre geri alabilirsiniz (proje ve varsa silinen tüm
                  fikirler birlikte geri gelir).
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting || deleteTarget?.ideaCount === null}
              onClick={onConfirmDelete}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
