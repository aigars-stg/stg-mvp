'use client';

import { CreditCard, CheckCircle2 } from 'lucide-react';

interface BankAccountCardProps {
  last4: string;
  bankName: string;
}

export function BankAccountCard({ last4, bankName }: BankAccountCardProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-aurora-green/5 border border-aurora-green/20 rounded-lg">
      <div className="w-10 h-10 rounded-full bg-aurora-green/10 flex items-center justify-center flex-shrink-0">
        <CreditCard className="w-5 h-5 text-aurora-green" />
      </div>
      <div className="flex-grow">
        <div className="flex items-center gap-2">
          <span className="font-medium text-polar-night">****{last4}</span>
          <CheckCircle2 className="w-4 h-4 text-aurora-green" />
        </div>
        <p className="text-sm text-text-secondary">{bankName}</p>
      </div>
    </div>
  );
}
