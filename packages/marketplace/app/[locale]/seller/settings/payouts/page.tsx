import { redirect } from 'next/navigation';

export default function PayoutsRedirect() {
  redirect('/seller/dashboard?tab=earnings');
}
