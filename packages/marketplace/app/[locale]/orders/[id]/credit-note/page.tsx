import { getTranslations } from 'next-intl/server';
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
  const [{ user, isStaff, serviceClient }, t] = await Promise.all([
    requireServerAuth(locale),
    getTranslations({ locale, namespace: 'Documents' }),
  ]);

  const data = await getCreditNoteData(serviceClient, orderId, user.id, isStaff);

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-polar-night">{t('creditNote.notAvailable')}</h1>
          <p className="mt-2 text-text-secondary">{t('creditNote.notAvailableDescription')}</p>
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
      description: t('creditNote.reversalCommission', { amount: formatPrice(order.items_total) }),
      grossEuros: -commission.gross,
      netEuros: -commission.net,
      vatRate,
      vatEuros: -commission.vat,
    },
    {
      description: t('creditNote.reversalShipping'),
      grossEuros: -shipping.gross,
      netEuros: -shipping.net,
      vatRate: order.shipping_vat_rate ?? LATVIA_VAT_RATE,
      vatEuros: -shipping.vat,
    },
  ];

  const totalGross = -(commission.gross + shipping.gross);
  const totalNet = -(commission.net + shipping.net);
  const totalVat = -(commission.vat + shipping.vat);

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
      title={t('creditNote.title')}
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
      {/* References */}
      <div className="mb-6 space-y-1 text-sm text-text-secondary">
        <p>{t('creditNote.order')} {order.order_number}</p>
        {order.invoice_number && <p>{t('creditNote.originalInvoice')} {order.invoice_number}</p>}
        {order.refund_reason && <p>{t('creditNote.reason')} {order.refund_reason}</p>}
      </div>

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

      <DocumentTotals
        rows={[
          { label: t('creditNote.totalNet'), amount: totalNet },
          { label: t('creditNote.vatLine', { rate: (vatRate * 100).toFixed(0) }), amount: totalVat },
          { label: t('creditNote.creditNoteTotal'), amount: totalGross, bold: true },
        ]}
      />

      {/* Refund summary */}
      <div className="mt-8 rounded-lg bg-snow-storm p-4 text-sm print:bg-gray-50">
        <p className="font-medium text-polar-night">{t('creditNote.refundSummary')}</p>
        <div className="mt-2 space-y-1 text-text-secondary">
          <div className="flex justify-between">
            <span>{t('creditNote.sellerWalletClawback')}</span>
            <span>{formatPrice((order.seller_wallet_credit_cents ?? 0) / 100)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('creditNote.platformCommissionReversed')}</span>
            <span>{formatPrice(Math.abs(totalGross))}</span>
          </div>
          <div className="flex justify-between font-medium text-polar-night">
            <span>{t('creditNote.buyerRefund')}</span>
            <span>{formatPrice(order.refund_amount ?? order.total_amount)}</span>
          </div>
        </div>
      </div>
    </DocumentLayout>
  );
}
