interface FeeExampleProps {
  gamePrice: number;
  shipping?: number;
  commission?: number;
  currency?: string;
}

export function FeeExample({
  gamePrice,
  shipping = 2,
  commission = 0.1,
  currency = '€',
}: FeeExampleProps) {
  // MDX passes props as strings — coerce to numbers
  const price = Number(gamePrice);
  const ship = Number(shipping);
  const comm = Number(commission);

  const buyerTotal = price + ship;
  const commissionAmount = price * comm;
  const sellerReceives = price - commissionAmount;
  const pct = Math.round(comm * 100);

  const fmt = (n: number) => `${currency}${n.toFixed(2)}`;

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-border-subtle print:break-inside-avoid">
      <table className="w-full text-sm">
        <tbody>
          <Row label="Game price" value={fmt(price)} />
          <Row label="Shipping" value={fmt(ship)} />
          <Row label="Buyer pays" value={fmt(buyerTotal)} bold />
          <Row
            label={`Commission (${pct}%)`}
            value={`-${fmt(commissionAmount)}`}
            muted
          />
          <Row label="Seller receives" value={fmt(sellerReceives)} bold last />
        </tbody>
      </table>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
  last,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  last?: boolean;
}) {
  return (
    <tr
      className={`${last ? '' : 'border-b border-border-subtle'} ${
        bold ? 'bg-snow-stormLightest' : ''
      }`}
    >
      <td
        className={`px-4 py-2.5 ${
          bold
            ? 'font-semibold text-polar-night'
            : muted
              ? 'text-text-secondary'
              : 'text-polar-nightDark'
        }`}
      >
        {label}
      </td>
      <td
        className={`px-4 py-2.5 text-right ${
          bold
            ? 'font-semibold text-polar-night'
            : muted
              ? 'text-text-secondary'
              : 'text-polar-nightDark'
        }`}
      >
        {value}
      </td>
    </tr>
  );
}
