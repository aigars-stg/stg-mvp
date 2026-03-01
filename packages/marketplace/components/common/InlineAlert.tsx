import { AlertCircle } from '@/lib/icons';

interface InlineAlertProps {
  message: string;
  compact?: boolean;
}

export function InlineAlert({ message, compact = false }: InlineAlertProps) {
  return compact ? (
    <div role="alert" className="mb-2 p-3 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-start gap-2">
      <AlertCircle className="w-4 h-4 text-aurora-red flex-shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-xs text-aurora-red">{message}</p>
    </div>
  ) : (
    <div role="alert" className="mb-3 p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-aurora-red flex-shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-sm text-aurora-red">{message}</p>
    </div>
  );
}
