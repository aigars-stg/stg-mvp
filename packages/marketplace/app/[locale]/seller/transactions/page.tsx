import { redirect } from 'next/navigation';

export default function TransactionsRedirect() {
  redirect('/seller/dashboard?tab=earnings');
}
