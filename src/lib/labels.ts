export const CATEGORIES = ["NOTEBOOKS", "MONITORES", "CAMERAS", "CABOS", "PROJETORES"] as const;
export type CategoryKey = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  NOTEBOOKS: "Notebooks",
  MONITORES: "Monitores",
  CAMERAS: "Câmeras",
  CABOS: "Cabos",
  PROJETORES: "Projetores",
};

export type EquipmentState = "available" | "loaned" | "maintenance" | "retired";

export const STATE_LABEL: Record<EquipmentState, string> = {
  available: "Disponível",
  loaned: "Emprestado",
  maintenance: "Manutenção",
  retired: "Fora de uso",
};
