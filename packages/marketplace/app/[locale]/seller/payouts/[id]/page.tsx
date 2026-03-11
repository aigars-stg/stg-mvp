import { getTranslations } from 'next-intl/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { getPayoutStatementData } from '@/lib/services/document-service';
import { formatPrice, formatCentsToCurrency } from '@/lib/services/pricing';
import { formatDate } from '@/lib/date-utils';
import { DocumentLayout } from '@/components/documents/DocumentLayout';
import { DocumentTotals } from '@/components/documents/DocumentTotals';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function PayoutStatementPage({ params }: Props) {
  const { locale, id: withdrawalId } = await params;
  const [{ user, isStaff, serviceClient }, t] = await Promise.all([
    requireServerAuth(locale),
    getTranslations({ locale, namespace: 'Documents' }),
  ]);

  const data = await getPayoutStatementData(serviceClient, withdrawalId, user.id, isStaff);

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-polar-night">{t('payoutStatement.notAvailable')}</h1>
          <p className="mt-2 text-text-secondary">{t('payoutStatement.notAvailableDescription')}</p>
        </div>
      </div>
    );
  }

  const { document, withdrawal, seller, orders } = data;
  const payoutEuros = withdrawal.amount_cents / 100;

  // Mask IBAN: show first 4 and last 4 characters
  const maskedIban = withdrawal.iban.length > 8
    ? `${withdrawal.iban.slice(0, 4)}****${withdrawal.iban.slice(-4)}`
    : withdrawal.iban;

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
      title={t('payoutStatement.title')}
      documentNumber={document.document_number}
      date={document.created_at}
      labels={layoutLabels}
      recipient={
        <div>
          <p className="font-medium">{seller.full_name}</p>
          <p>{t('payoutStatement.ibanLabel')} {maskedIban}</p>
          {withdrawal.account_holder_name && (
            <p>{t('payoutStatement.accountHolder')} {withdrawal.account_holder_name}</p>
          )}
        </div>
      }
    >
      {/* Orders table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs font-medium uppercase tracking-wide text-text-secondary">
              <th className="pb-2 pr-4">{t('payoutStatement.orderColumn')}</th>
              <th className="pb-2 pr-4">{t('payoutStatement.dateColumn')}</th>
              <th className="pb-2 pr-4">{t('payoutStatement.invoiceColumn')}</th>
              <th className="pb-2 pr-4 text-right">{t('payoutStatement.itemsColumn')}</th>
              <th className="pb-2 pr-4 text-right">{t('payoutStatement.commissionColumn')}</th>
              <th className="pb-2 text-right">{t('payoutStatement.netCreditColumn')}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border-subtle">
                <td className="py-3 pr-4 text-polar-night">{order.order_number}</td>
                <td className="py-3 pr-4 text-text-secondary">
                  {order.paid_at ? formatDate(order.paid_at) : '—'}
                </td>
                <td className="py-3 pr-4 text-text-secondary">
                  {order.invoice_number || '—'}
                </td>
                <td className="py-3 pr-4 text-right text-polar-night">
                  {formatPrice(order.items_total)}
                </td>
                <td className="py-3 pr-4 text-right text-text-secondary">
                  -{formatCentsToCurrency(order.platform_commission_cents)}
                </td>
                <td className="py-3 text-right text-polar-night">
                  {formatCentsToCurrency(order.seller_wallet_credit_cents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payout total */}
      <DocumentTotals
        rows={[
          { label: t('payoutStatement.netPayout'), amount: payoutEuros, bold: true },
        ]}
      />

      {/* Transfer details */}
      <div className="mt-8 rounded-lg bg-snow-storm p-4 text-sm print:bg-gray-50">
        <p className="font-medium text-polar-night">{t('payoutStatement.transferDetails')}</p>
        <div className="mt-2 space-y-1 text-text-secondary">
          <div className="flex justify-between">
            <span>{t('payoutStatement.ibanRow')}</span>
            <span>{maskedIban}</span>
          </div>
          {withdrawal.bank_reference && (
            <div className="flex justify-between">
              <span>{t('payoutStatement.bankReference')}</span>
              <span>{withdrawal.bank_reference}</span>
            </div>
          )}
          {withdrawal.processed_at && (
            <div className="flex justify-between">
              <span>{t('payoutStatement.completed')}</span>
              <span>{formatDate(withdrawal.processed_at)}</span>
            </div>
          )}
        </div>
      </div>
    </DocumentLayout>
  );
}
