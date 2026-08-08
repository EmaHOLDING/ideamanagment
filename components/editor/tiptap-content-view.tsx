"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Markdown } from "@tiptap/markdown";
import { cn } from "@/lib/utils";

const EXTENSIONS = [StarterKit, Link, Markdown];

export function TiptapContentView({
  content,
  className,
  clamp,
}: {
  content: string | null | undefined;
  className?: string;
  clamp?: boolean;
}) {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: content ?? "",
    contentType: "markdown",
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "[&_p]:my-2 [&_p]:leading-relaxed [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_li]:leading-relaxed " +
          "[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:font-heading [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:first:mt-0 " +
          "[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:font-heading [&_h2]:text-base [&_h2]:font-semibold [&_h2]:first:mt-0 " +
          "[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:font-heading [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:first:mt-0 " +
          "[&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic " +
          "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80 " +
          "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic " +
          "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] " +
          "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
          "[&_hr]:my-3 [&_hr]:border-border [&_>*:first-child]:mt-0 [&_>*:last-child]:mb-0",
      },
    },
  });

  return (
    <div
      className={cn(
        "max-w-none text-sm text-foreground",
        clamp && "line-clamp-3",
        className
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
