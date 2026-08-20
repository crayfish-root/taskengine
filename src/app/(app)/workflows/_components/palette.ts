// Small fixed color palette for workflow statuses — keeps custom pipelines visually
// consistent with the rest of the app instead of allowing arbitrary hex input.
export const STATUS_PALETTE = [
  { name: "Slate", value: "#6b7280" },
  { name: "Blue", value: "#3b63f6" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Green", value: "#1fa463" },
  { name: "Amber", value: "#c98a06" },
  { name: "Red", value: "#d63b3b" },
  { name: "Pink", value: "#ec4899" },
];

export function nextPaletteColor(index: number) {
  return STATUS_PALETTE[index % STATUS_PALETTE.length].value;
}
