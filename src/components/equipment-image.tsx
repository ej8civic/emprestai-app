import type { CategoryKey } from "@/lib/labels";
import { cn } from "@/lib/cn";
import { EquipmentIcon } from "@/components/equipment-icon";

/** Foto 4:3 do equipamento; sem foto, o ícone da categoria no mesmo espaço. */
export function EquipmentImage({
  image,
  category,
  name,
  className,
}: {
  image: { url: string } | null;
  category: CategoryKey;
  name: string;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-line bg-surface-2", className)}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- a foto já vem em 800x600 do nosso bucket
        <img src={image.url} alt={name} width={800} height={600} loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center">
          <EquipmentIcon category={category} />
        </div>
      )}
    </div>
  );
}
