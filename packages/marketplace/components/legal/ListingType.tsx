import {
  ShoppingCartIcon,
  ChatTextIcon,
  TagIcon,
  GavelIcon,
} from '@phosphor-icons/react/ssr';
import type { Icon } from '@phosphor-icons/react';

const iconMap: Record<string, Icon> = {
  ShoppingCart: ShoppingCartIcon,
  ChatText: ChatTextIcon,
  Tag: TagIcon,
  Gavel: GavelIcon,
};

interface ListingTypeProps {
  icon: string;
  title: string;
  children: React.ReactNode;
}

export function ListingType({ icon, title, children }: ListingTypeProps) {
  const IconComponent = iconMap[icon];

  return (
    <div className="my-3 rounded-lg border border-border-subtle bg-snow-white p-4">
      <div className="flex items-center gap-2">
        {IconComponent && (
          <IconComponent size={24} className="shrink-0 text-frost-arctic" />
        )}
        <span className="font-semibold text-polar-night">{title}</span>
      </div>
      <div className="mt-2 text-sm leading-relaxed text-polar-nightDark">
        {children}
      </div>
    </div>
  );
}
