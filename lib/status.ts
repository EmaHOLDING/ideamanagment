import type { Database } from "@/lib/types/database.types";

export type StatusType = Database["public"]["Enums"]["status_type"];
export type ImpactEffortLevel = Database["public"]["Enums"]["impact_effort_level"];
export type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  OWNER: "Kurucu",
  ADMIN: "Yönetici",
  MEMBER: "Üye",
  VIEWER: "Gözlemci",
};

export const ASSIGNABLE_WORKSPACE_ROLES: Extract<WorkspaceRole, "MEMBER" | "ADMIN" | "VIEWER">[] = [
  "MEMBER",
  "ADMIN",
  "VIEWER",
];

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

export const TAG_COLORS = [
  { value: "gray", dotClass: "bg-gray-400", badgeClass: "border-gray-300 text-gray-700 dark:text-gray-300" },
  { value: "red", dotClass: "bg-red-500", badgeClass: "border-red-300 text-red-700 dark:text-red-300" },
  { value: "orange", dotClass: "bg-orange-500", badgeClass: "border-orange-300 text-orange-700 dark:text-orange-300" },
  { value: "amber", dotClass: "bg-amber-500", badgeClass: "border-amber-300 text-amber-700 dark:text-amber-300" },
  { value: "green", dotClass: "bg-green-500", badgeClass: "border-green-300 text-green-700 dark:text-green-300" },
  { value: "blue", dotClass: "bg-blue-500", badgeClass: "border-blue-300 text-blue-700 dark:text-blue-300" },
  { value: "purple", dotClass: "bg-purple-500", badgeClass: "border-purple-300 text-purple-700 dark:text-purple-300" },
  { value: "pink", dotClass: "bg-pink-500", badgeClass: "border-pink-300 text-pink-700 dark:text-pink-300" },
] as const;

export function tagColorClasses(color: string) {
  return TAG_COLORS.find((c) => c.value === color) ?? TAG_COLORS[0];
}
