import { ClipboardList } from 'griddy-icons';

interface PlainTermsBoxProps {
  children: React.ReactNode;
}

export function PlainTermsBox({ children }: PlainTermsBoxProps) {
  return (
    <div className="my-6 rounded-lg border border-frost-ice/20 bg-frost-ice/5 p-4 sm:p-5">
      <div className="mb-2 flex items-center gap-2 font-semibold text-polar-night dark:text-snow-stormLightest">
        <ClipboardList className="h-4 w-4 text-frost-ice" />
        <span>In plain terms</span>
      </div>
      <div className="text-sm leading-relaxed text-text-secondary dark:text-snow-stormLight">
        {children}
      </div>
    </div>
  );
}
