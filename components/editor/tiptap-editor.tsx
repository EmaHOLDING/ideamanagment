"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Markdown } from "@tiptap/markdown";
import { Bold, Italic, List, ListOrdered, Heading2, UploadIcon } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EXTENSIONS = [StarterKit, Link.configure({ openOnClick: false }), Markdown];

export function TiptapEditor({
  content,
  onChange,
  className,
  compact = false,
}: {
  content: string | undefined;
  onChange: (markdown: string) => void;
  className?: string;
  compact?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: EXTENSIONS,
    content: content ?? "",
    contentType: "markdown",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          `${compact ? "min-h-20" : "min-h-32"} min-w-0 max-w-full overflow-hidden rounded-md border border-input bg-transparent px-3 py-2 font-sans text-sm outline-none [overflow-wrap:anywhere] focus-visible:ring-3 focus-visible:ring-ring/50 [&_*]:max-w-full [&_p]:my-1 [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getMarkdown());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const nextContent = content ?? "";
    if (editor.getMarkdown() === nextContent) return;
    editor.commands.setContent(nextContent, {
      contentType: "markdown",
      emitUpdate: false,
    });
  }, [content, editor]);

  if (!editor) return null;

  function onImportClick() {
    fileInputRef.current?.click();
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      editor.commands.setContent(text, { contentType: "markdown" });
    };
    reader.readAsText(file);
  }

  return (
    <div className={cn("flex min-w-0 max-w-full flex-col gap-1.5 overflow-hidden", className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <Toggle
          size="sm"
          pressed={editor.isActive("bold")}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("italic")}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("bulletList")}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-3.5" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("orderedList")}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-3.5" />
        </Toggle>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="ml-auto text-muted-foreground"
          onClick={onImportClick}
        >
          <UploadIcon /> MD İçe Aktar
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,text/markdown"
          className="hidden"
          onChange={onFileSelected}
        />
      </div>
      <EditorContent editor={editor} className="min-w-0 max-w-full overflow-hidden" />
    </div>
  );
}
