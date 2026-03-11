import { formatPrice } from '@/lib/services/pricing';

export interface LineItem {
  description: string;
  grossEuros: number;
  netEuros: number;
  vatRate: number;
  vatEuros: number;
}

interface DocumentLineItemLabels {
  description?: string;
  gross?: string;
  net?: string;
  vatRate?: string;
  vat?: string;
}

interface DocumentLineItemsProps {
  items: LineItem[];
  labels?: DocumentLineItemLabels;
}

export function DocumentLineItems({ items, labels }: DocumentLineItemsProps) {
  const l = {
    description: labels?.description ?? 'Description',
    gross: labels?.gross ?? 'Gross',
    net: labels?.net ?? 'Net',
    vatRate: labels?.vatRate ?? 'VAT Rate',
    vat: labels?.vat ?? 'VAT',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs font-medium uppercase tracking-wide text-text-secondary">
            <th className="pb-2 pr-4">{l.description}</th>
            <th className="pb-2 pr-4 text-right">{l.gross}</th>
            <th className="pb-2 pr-4 text-right">{l.net}</th>
            <th className="pb-2 pr-4 text-right">{l.vatRate}</th>
            <th className="pb-2 text-right">{l.vat}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-border-subtle">
              <td className="py-3 pr-4 text-polar-night">{item.description}</td>
              <td className="py-3 pr-4 text-right text-polar-night">{formatPrice(item.grossEuros)}</td>
              <td className="py-3 pr-4 text-right text-text-secondary">{formatPrice(item.netEuros)}</td>
              <td className="py-3 pr-4 text-right text-text-secondary">{(item.vatRate * 100).toFixed(0)}%</td>
              <td className="py-3 text-right text-text-secondary">{formatPrice(item.vatEuros)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
