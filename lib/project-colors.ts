export const PROJECT_COLORS = [
  { value: "indigo", label: "İndigo", hex: "#6366f1" },
  { value: "blue", label: "Mavi", hex: "#3b82f6" },
  { value: "cyan", label: "Camgöbeği", hex: "#06b6d4" },
  { value: "emerald", label: "Zümrüt", hex: "#10b981" },
  { value: "amber", label: "Kehribar", hex: "#f59e0b" },
  { value: "orange", label: "Turuncu", hex: "#f97316" },
  { value: "rose", label: "Gül", hex: "#f43f5e" },
  { value: "violet", label: "Menekşe", hex: "#8b5cf6" },
] as const;

export type ProjectColor = (typeof PROJECT_COLORS)[number]["value"];

export function projectColorHex(color: string | null | undefined) {
  return PROJECT_COLORS.find((item) => item.value === color)?.hex ?? PROJECT_COLORS[0].hex;
}
