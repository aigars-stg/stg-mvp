import { requireServerAuth } from '@/lib/auth/server-auth';
import { getCommissionInvoiceData } from '@/lib/services/document-service';
import { resolveVatBreakdown, LATVIA_VAT_RATE } from '@/lib/bookkeeping-utils';
import { DocumentLayout } from '@/components/documents/DocumentLayout';
import { DocumentLineItems, type LineItem } from '@/components/documents/DocumentLineItems';
import { DocumentTotals } from '@/components/documents/DocumentTotals';
import { formatPrice } from '@/lib/services/pricing';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function InvoicePage({ params }: Props) {
  const { locale, id: orderId } = await params;
  const { user, isStaff, serviceClient } = await requireServerAuth(locale);

  const data = await getCommissionInvoiceData(serviceClient, orderId, user.id, isStaff);

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-polar-night">Invoice not available</h1>
          <p className="mt-2 text-text-secondary">
            This invoice is not yet available or you do not have access.
          </p>
        </div>
      </div>
    );
  }

  const { document, order, seller } = data;

  // Resolve VAT breakdowns
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
      description: `Marketplace commission (10% of ${formatPrice(order.items_total)})`,
      grossEuros: commission.gross,
      netEuros: commission.net,
      vatRate,
      vatEuros: commission.vat,
    },
    {
      description: 'Shipping management',
      grossEuros: shipping.gross,
      netEuros: shipping.net,
      vatRate: order.shipping_vat_rate ?? LATVIA_VAT_RATE,
      vatEuros: shipping.vat,
    },
  ];

  const totalGross = commission.gross + shipping.gross;
  const totalNet = commission.net + shipping.net;
  const totalVat = commission.vat + shipping.vat;
  const sellerCredit = (order.seller_wallet_credit_cents ?? 0) / 100;

  return (
    <DocumentLayout
      title="Platform Services Invoice"
      documentNumber={document.document_number}
      date={document.created_at}
      recipient={
        <div>
          <p className="font-medium">{seller.full_name}</p>
          {seller.country && <p>Country: {seller.country}</p>}
        </div>
      }
    >
      {/* Order reference */}
      <p className="mb-6 text-sm text-text-secondary">
        Order: {order.order_number}
      </p>

      {/* Line items */}
      <DocumentLineItems items={lineItems} />

      {/* Totals */}
      <DocumentTotals
        rows={[
          { label: 'Total net', amount: totalNet },
          { label: `VAT (${(vatRate * 100).toFixed(0)}%)`, amount: totalVat },
          { label: 'Invoice total', amount: totalGross, bold: true },
        ]}
      />

      {/* Informational section */}
      <div className="mt-8 rounded-lg bg-snow-storm p-4 text-sm print:bg-gray-50">
        <p className="font-medium text-polar-night">Payment summary</p>
        <div className="mt-2 space-y-1 text-text-secondary">
          <div className="flex justify-between">
            <span>Total collected from buyer</span>
            <span>{formatPrice(order.total_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Platform services (this invoice)</span>
            <span>-{formatPrice(totalGross)}</span>
          </div>
          <div className="flex justify-between font-medium text-polar-night">
            <span>Credited to your wallet</span>
            <span>{formatPrice(sellerCredit)}</span>
          </div>
        </div>
      </div>
    </DocumentLayout>
  );
}
