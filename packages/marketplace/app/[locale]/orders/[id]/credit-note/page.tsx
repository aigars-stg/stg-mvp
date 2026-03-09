import { requireServerAuth } from '@/lib/auth/server-auth';
import { getCreditNoteData } from '@/lib/services/document-service';
import { resolveVatBreakdown, LATVIA_VAT_RATE } from '@/lib/bookkeeping-utils';
import { DocumentLayout } from '@/components/documents/DocumentLayout';
import { DocumentLineItems, type LineItem } from '@/components/documents/DocumentLineItems';
import { DocumentTotals } from '@/components/documents/DocumentTotals';
import { formatPrice } from '@/lib/services/pricing';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function CreditNotePage({ params }: Props) {
  const { locale, id: orderId } = await params;
  const { user, isStaff, serviceClient } = await requireServerAuth(locale);

  const data = await getCreditNoteData(serviceClient, orderId, user.id, isStaff);

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-polar-night">Credit note not available</h1>
          <p className="mt-2 text-text-secondary">
            This credit note is not yet available or you do not have access.
          </p>
        </div>
      </div>
    );
  }

  const { document, order, seller } = data;

  const vatRate = order.commission_vat_rate ?? LATVIA_VAT_RATE;
  const commission = resolveVatBreakdown(
    order.platform_commission_cents / 100,
    order.commission_net_cents,
    order.commission_vat_cents,
  );
  const shipping = resolveVatBreakdown(
    order.shipping_cost,
    order.shipping_net_cents,
    order.shipping_vat_cents,
  );

  const lineItems: LineItem[] = [
    {
      description: `Reversal: marketplace commission (10% of ${formatPrice(order.items_total)})`,
      grossEuros: -commission.gross,
      netEuros: -commission.net,
      vatRate,
      vatEuros: -commission.vat,
    },
    {
      description: 'Reversal: shipping management',
      grossEuros: -shipping.gross,
      netEuros: -shipping.net,
      vatRate: order.shipping_vat_rate ?? LATVIA_VAT_RATE,
      vatEuros: -shipping.vat,
    },
  ];

  const totalGross = -(commission.gross + shipping.gross);
  const totalNet = -(commission.net + shipping.net);
  const totalVat = -(commission.vat + shipping.vat);

  return (
    <DocumentLayout
      title="Credit Note"
      documentNumber={document.document_number}
      date={document.created_at}
      recipient={
        <div>
          <p className="font-medium">{seller.full_name}</p>
          {seller.country && <p>Country: {seller.country}</p>}
        </div>
      }
    >
      {/* References */}
      <div className="mb-6 space-y-1 text-sm text-text-secondary">
        <p>Order: {order.order_number}</p>
        {order.invoice_number && <p>Original invoice: {order.invoice_number}</p>}
        {order.refund_reason && <p>Reason: {order.refund_reason}</p>}
      </div>

      <DocumentLineItems items={lineItems} />

      <DocumentTotals
        rows={[
          { label: 'Total net', amount: totalNet },
          { label: `VAT (${(vatRate * 100).toFixed(0)}%)`, amount: totalVat },
          { label: 'Credit note total', amount: totalGross, bold: true },
        ]}
      />

      {/* Refund summary */}
      <div className="mt-8 rounded-lg bg-snow-storm p-4 text-sm print:bg-gray-50">
        <p className="font-medium text-polar-night">Refund summary</p>
        <div className="mt-2 space-y-1 text-text-secondary">
          <div className="flex justify-between">
            <span>Seller wallet clawback</span>
            <span>{formatPrice((order.seller_wallet_credit_cents ?? 0) / 100)}</span>
          </div>
          <div className="flex justify-between">
            <span>Platform commission reversed</span>
            <span>{formatPrice(Math.abs(totalGross))}</span>
          </div>
          <div className="flex justify-between font-medium text-polar-night">
            <span>Buyer refund</span>
            <span>{formatPrice(order.refund_amount ?? order.total_amount)}</span>
          </div>
        </div>
      </div>
    </DocumentLayout>
  );
}
