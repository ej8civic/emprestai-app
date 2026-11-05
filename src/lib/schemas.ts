import { z } from "zod";
import { CATEGORIES } from "@/lib/labels";

/** Mesmo schema valida o formulário e o `.input()` do procedimento (ADR-001). */
export const createEquipmentInput = z.object({
  name: z.string().trim().min(2, "Informe o nome."),
  category: z.enum(CATEGORIES),
  patrimonio: z.string().trim().regex(/^[A-Z]{2,4}-\d{4}$/i, "Use o formato AA-0000, como TI-0001 ou PAT-0001."),
  serial: z.string().trim().optional(),
  pickupLocation: z.string().trim().min(2, "Informe o local de retirada."),
  status: z.enum(["AVAILABLE", "MAINTENANCE", "RETIRED"]),
  notes: z.string().trim().max(500, "Máximo de 500 caracteres.").optional(),
});
export type CreateEquipmentInput = z.infer<typeof createEquipmentInput>;
