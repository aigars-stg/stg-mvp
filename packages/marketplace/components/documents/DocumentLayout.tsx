import { STG_COMPANY } from '@/lib/constants/company';
import { formatDate } from '@/lib/date-utils';
import { PrintButton } from '@/components/legal/PrintButton';

interface DocumentLayoutProps {
  /** Document title, e.g. "Platform Services Invoice" */
  title: string;
  /** Sequential document number, e.g. "COM-2026-00001" */
  documentNumber: string;
  /** Document date (ISO string) */
  date: string;
  /** Recipient block — name, address, VAT number etc. */
  recipient: React.ReactNode;
  children: React.ReactNode;
}

export function DocumentLayout({
  title,
  documentNumber,
  date,
  recipient,
  children,
}: DocumentLayoutProps) {
  const formattedDate = formatDate(date);

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          [data-no-print], nav, header, footer { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
          .document-container { max-width: 100% !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-snow-storm py-6 print:bg-white print:py-0">
        <div className="document-container mx-auto max-w-4xl px-4 sm:px-6">
          <div className="rounded-xl border border-border bg-snow-white p-6 shadow-sm sm:p-10">
            {/* Header: company + print button */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-bold text-polar-night">{STG_COMPANY.legalName}</p>
                <p className="text-sm text-text-secondary">{STG_COMPANY.address}</p>
                <p className="text-sm text-text-secondary">Reg. {STG_COMPANY.registrationNumber} / VAT {STG_COMPANY.vatNumber}</p>
              </div>
              <PrintButton />
            </div>

            {/* Document title + number + date */}
            <div className="mt-8 border-b border-border-subtle pb-4">
              <h1 className="text-2xl font-bold text-polar-night">{title}</h1>
              <div className="mt-1 flex flex-wrap gap-x-6 text-sm text-text-secondary">
                <span>No. {documentNumber}</span>
                <span>Date: {formattedDate}</span>
              </div>
            </div>

            {/* Recipient */}
            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Recipient</p>
              <div className="mt-1 text-sm text-polar-night">{recipient}</div>
            </div>

            {/* Document body */}
            <div className="mt-8">{children}</div>

            {/* Footer */}
            <div className="mt-12 border-t border-border-subtle pt-4 text-xs text-text-secondary">
              <p>This document was generated electronically and is valid without a signature.</p>
              <p className="mt-1">{STG_COMPANY.legalName} / {STG_COMPANY.vatNumber} / {STG_COMPANY.bankName} / {STG_COMPANY.iban}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
