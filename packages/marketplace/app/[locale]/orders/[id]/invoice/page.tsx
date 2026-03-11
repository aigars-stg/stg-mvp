import { getTranslations } from 'next-intl/server';
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
  const [{ user, isStaff, serviceClient }, t] = await Promise.all([
    requireServerAuth(locale),
    getTranslations({ locale, namespace: 'Documents' }),
  ]);

  const data = await getCommissionInvoiceData(serviceClient, orderId, user.id, isStaff);

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-polar-night">{t('invoice.notAvailable')}</h1>
          <p className="mt-2 text-text-secondary">{t('invoice.notAvailableDescription')}</p>
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
      description: t('invoice.commissionLineItem', { amount: formatPrice(order.items_total) }),
      grossEuros: commission.gross,
      netEuros: commission.net,
      vatRate,
      vatEuros: commission.vat,
    },
    {
      description: t('invoice.shippingManagement'),
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

  const layoutLabels = {
    reg: t('layout.reg'),
    vat: t('layout.vat'),
    no: t('layout.no'),
    date: t('layout.date'),
    recipient: t('layout.recipient'),
    electronicSignature: t('layout.electronicSignature'),
  };

  return (
    <DocumentLayout
      title={t('invoice.title')}
      documentNumber={document.document_number}
      date={document.created_at}
      labels={layoutLabels}
      recipient={
        <div>
          <p className="font-medium">{seller.full_name}</p>
          {seller.country && <p>{t('invoice.country')} {seller.country}</p>}
        </div>
      }
    >
      {/* Order reference */}
      <p className="mb-6 text-sm text-text-secondary">
        {t('invoice.order')} {order.order_number}
      </p>

      {/* Line items */}
      <DocumentLineItems
        items={lineItems}
        labels={{
          description: t('lineItems.description'),
          gross: t('lineItems.gross'),
          net: t('lineItems.net'),
          vatRate: t('lineItems.vatRate'),
          vat: t('lineItems.vat'),
        }}
      />

      {/* Totals */}
      <DocumentTotals
        rows={[
          { label: t('invoice.totalNet'), amount: totalNet },
          { label: t('invoice.vatLine', { rate: (vatRate * 100).toFixed(0) }), amount: totalVat },
          { label: t('invoice.invoiceTotal'), amount: totalGross, bold: true },
        ]}
      />

      {/* Informational section */}
      <div className="mt-8 rounded-lg bg-snow-storm p-4 text-sm print:bg-gray-50">
        <p className="font-medium text-polar-night">{t('invoice.paymentSummary')}</p>
        <div className="mt-2 space-y-1 text-text-secondary">
          <div className="flex justify-between">
            <span>{t('invoice.totalCollected')}</span>
            <span>{formatPrice(order.total_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('invoice.platformServices')}</span>
            <span>-{formatPrice(totalGross)}</span>
          </div>
          <div className="flex justify-between font-medium text-polar-night">
            <span>{t('invoice.creditedToWallet')}</span>
            <span>{formatPrice(sellerCredit)}</span>
          </div>
        </div>
      </div>
    </DocumentLayout>
  );
}
