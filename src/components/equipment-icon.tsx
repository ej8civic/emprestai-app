import { Laptop, Monitor, Plugs, ProjectorScreen, VideoCamera } from "@phosphor-icons/react";
import type { CategoryKey } from "@/lib/labels";
import { cn } from "@/lib/cn";

const ICONS = {
  NOTEBOOKS: Laptop,
  MONITORES: Monitor,
  CAMERAS: VideoCamera,
  CABOS: Plugs,
  PROJETORES: ProjectorScreen,
} satisfies Record<CategoryKey, unknown>;

export function EquipmentIcon({ category, className }: { category: CategoryKey; className?: string }) {
  const Icon = ICONS[category];
  return (
    <span
      aria-hidden
      className={cn("grid size-10 shrink-0 place-items-center rounded-lg border border-line-strong bg-surface-2 text-fg", className)}
    >
      <Icon className="size-5" />
    </span>
  );
}
