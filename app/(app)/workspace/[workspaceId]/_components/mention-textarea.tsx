"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { getWorkspaceMembers } from "@/app/actions/workspaceActions";

type Member = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];

function findMentionQuery(text: string, cursor: number) {
  const upToCursor = text.slice(0, cursor);
  const atIndex = upToCursor.lastIndexOf("@");
  if (atIndex === -1) return null;

  const between = upToCursor.slice(atIndex + 1);
  if (/\s/.test(between)) return null;

  return { start: atIndex, query: between.toLowerCase() };
}

export function MentionTextarea({
  value,
  onChange,
  members,
  mentionedUserIds,
  onMentionedUserIdsChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  members: Member[];
  mentionedUserIds: string[];
  onMentionedUserIdsChange: (ids: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(
    null
  );

  const filteredMembers = mention
    ? members
        .filter(
          (m) =>
            m.fullName.toLowerCase().includes(mention.query) ||
            (m.email ?? "").toLowerCase().includes(mention.query)
        )
        .slice(0, 6)
    : [];

  function updateMentionState(text: string, cursor: number) {
    const next = findMentionQuery(text, cursor);
    setMention(next);
    setActiveIndex(0);
    if (next && textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect();
      setMenuRect({ top: rect.top, left: rect.left, width: rect.width });
    }
  }

  // Dropdown pozisyonu getBoundingClientRect ile hesaplandığı için, açıkken
  // herhangi bir ata elementte (ör. ScrollArea) scroll/resize olursa
  // konum bayatlar — bu durumda dropdown'ı kapatmak en güvenlisi.
  useEffect(() => {
    if (!mention) return;
    function close() {
      setMention(null);
    }
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [mention]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    updateMentionState(e.target.value, e.target.selectionStart);
  }

  function selectMember(member: Member) {
    if (!mention || !textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const before = value.slice(0, mention.start);
    const after = value.slice(cursor);
    const label = member.fullName;
    const next = `${before}@${label} ${after}`;
    onChange(next);
    setMention(null);
    if (!mentionedUserIds.includes(member.user_id)) {
      onMentionedUserIdsChange([...mentionedUserIds, member.user_id]);
    }
    requestAnimationFrame(() => {
      const pos = before.length + label.length + 2;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!mention || filteredMembers.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filteredMembers.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filteredMembers.length) % filteredMembers.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      selectMember(filteredMembers[activeIndex]);
    } else if (e.key === "Escape") {
      setMention(null);
    }
  }

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(e) => updateMentionState(value, e.currentTarget.selectionStart)}
        placeholder={placeholder}
        className={className}
      />
      {mention &&
        filteredMembers.length > 0 &&
        menuRect &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: menuRect.top - 4,
              left: menuRect.left,
              width: Math.min(menuRect.width, 224),
              transform: "translateY(-100%)",
            }}
            className="z-50 flex flex-col gap-0.5 rounded-lg border bg-popover p-1 text-sm shadow-md"
          >
            {filteredMembers.map((m, i) => (
              <button
                key={m.user_id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectMember(m);
                }}
                className={cn(
                  "rounded-md px-2 py-1 text-left truncate",
                  i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                )}
              >
                {m.fullName}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
