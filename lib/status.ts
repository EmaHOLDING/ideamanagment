import type { Database } from "@/lib/types/database.types";

export type StatusType = Database["public"]["Enums"]["status_type"];
export type ImpactEffortLevel = Database["public"]["Enums"]["impact_effort_level"];

export const STATUS_LABELS: Record<StatusType, string> = {
  DRAFT: "Taslak",
  IN_REVIEW: "İncelemede",
  APPROVED: "Onaylandı",
  CANCELLED: "İptal",
  DONE: "Tamamlandı",
};

export const STATUS_BADGE_VARIANT: Record<
  StatusType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "secondary",
  IN_REVIEW: "outline",
  APPROVED: "default",
  CANCELLED: "destructive",
  DONE: "default",
};

export const STATUS_DOT_CLASS: Record<StatusType, string> = {
  DRAFT: "bg-muted-foreground/50",
  IN_REVIEW: "bg-amber-500",
  APPROVED: "bg-primary",
  CANCELLED: "bg-destructive",
  DONE: "bg-emerald-500",
};

export const IMPACT_EFFORT_LABELS: Record<ImpactEffortLevel, string> = {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
};
