import { getTranslations } from 'next-intl/server';
import { requireServerAuth } from '@/lib/auth/server-auth';
import { getOrderConfirmationData } from '@/lib/services/document-service';
import { formatPrice } from '@/lib/services/pricing';
import { formatDate } from '@/lib/date-utils';
import { DocumentLayout } from '@/components/documents/DocumentLayout';
import { DocumentTotals } from '@/components/documents/DocumentTotals';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function OrderConfirmationPage({ params }: Props) {
  const { locale, id: orderId } = await params;
  const [{ user, isStaff, serviceClient }, t] = await Promise.all([
    requireServerAuth(locale),
    getTranslations({ locale, namespace: 'Documents' }),
  ]);

  const data = await getOrderConfirmationData(serviceClient, orderId, user.id, isStaff);

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-polar-night">{t('confirmation.notAvailable')}</h1>
          <p className="mt-2 text-text-secondary">{t('confirmation.notAvailableDescription')}</p>
        </div>
      </div>
    );
  }

  const { order, buyer, seller, items } = data;
  const orderDate = order.paid_at || order.created_at;

  const walletApplied = order.buyer_wallet_debit_cents ? order.buyer_wallet_debit_cents / 100 : 0;
  const cardPayment = order.total_amount - walletApplied;

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
      title={t('confirmation.title')}
      documentNumber={order.order_number}
      date={orderDate}
      labels={layoutLabels}
      recipient={
        <div>
          <p className="font-medium">{buyer.full_name}</p>
        </div>
      }
    >
      {/* Seller info */}
      <p className="mb-6 text-sm text-text-secondary">
        {t('confirmation.seller')} {seller.full_name}
      </p>

      {/* Items table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs font-medium uppercase tracking-wide text-text-secondary">
              <th className="pb-2 pr-4">{t('confirmation.itemColumn')}</th>
              <th className="pb-2 pr-4">{t('confirmation.conditionColumn')}</th>
              <th className="pb-2 text-right">{t('confirmation.priceColumn')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border-subtle">
                <td className="py-3 pr-4 text-polar-night">{item.game_name}</td>
                <td className="py-3 pr-4 text-text-secondary capitalize">{item.condition}</td>
                <td className="py-3 text-right text-polar-night">{formatPrice(item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <DocumentTotals
        rows={[
          { label: t('confirmation.itemsRow'), amount: order.items_total },
          { label: t('confirmation.shippingRow'), amount: order.shipping_cost },
          { label: t('confirmation.totalPaid'), amount: order.total_amount, bold: true },
        ]}
      />

      {/* Payment details */}
      <div className="mt-8 rounded-lg bg-snow-storm p-4 text-sm print:bg-gray-50">
        <p className="font-medium text-polar-night">{t('confirmation.paymentDetails')}</p>
        <div className="mt-2 space-y-1 text-text-secondary">
          {cardPayment > 0 && (
            <div className="flex justify-between">
              <span>{t('confirmation.cardPayment')}</span>
              <span>{formatPrice(cardPayment)}</span>
            </div>
          )}
          {walletApplied > 0 && (
            <div className="flex justify-between">
              <span>{t('confirmation.walletApplied')}</span>
              <span>{formatPrice(walletApplied)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>{t('confirmation.dateLabel')}</span>
            <span>{formatDate(orderDate)}</span>
          </div>
        </div>
      </div>

      {/* Delivery info */}
      {order.shipping_method === 't2t' && order.destination_terminal_name && (
        <div className="mt-6 rounded-lg bg-snow-storm p-4 text-sm print:bg-gray-50">
          <p className="font-medium text-polar-night">{t('confirmation.delivery')}</p>
          <div className="mt-2 space-y-1 text-text-secondary">
            <p>{t('confirmation.parcelLocker')} {order.destination_terminal_name}</p>
            {order.destination_terminal_address && (
              <p>{order.destination_terminal_address}</p>
            )}
          </div>
        </div>
      )}

      {order.shipping_method === 'local_pickup' && (
        <div className="mt-6 rounded-lg bg-snow-storm p-4 text-sm print:bg-gray-50">
          <p className="font-medium text-polar-night">{t('confirmation.pickup')}</p>
          <div className="mt-2 space-y-1 text-text-secondary">
            {order.pickup_city && <p>{t('confirmation.city')} {order.pickup_city}</p>}
            {order.pickup_notes && <p>{t('confirmation.notes')} {order.pickup_notes}</p>}
          </div>
        </div>
      )}
    </DocumentLayout>
  );
}
