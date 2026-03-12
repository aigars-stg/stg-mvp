/**
 * Shared EveryPay helpers for Deno Edge Functions.
 * Uses fetch + btoa (Deno-compatible, no Node.js Buffer dependency).
 */

export async function voidEveryPay(paymentReference: string): Promise<void> {
  const apiUrl = Deno.env.get('EVERYPAY_API_URL')!
  const apiUsername = Deno.env.get('EVERYPAY_API_USERNAME')!
  const apiSecret = Deno.env.get('EVERYPAY_API_SECRET')!

  const res = await fetch(`${apiUrl}/payments/void`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: 'Basic ' + btoa(`${apiUsername}:${apiSecret}`),
    },
    body: JSON.stringify({
      api_username: apiUsername,
      payment_reference: paymentReference,
      nonce: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(`Void failed: ${data?.error?.message || res.statusText}`)
  }
}

export async function refundEveryPay(paymentReference: string, amountCents: number): Promise<void> {
  const apiUrl = Deno.env.get('EVERYPAY_API_URL')!
  const apiUsername = Deno.env.get('EVERYPAY_API_USERNAME')!
  const apiSecret = Deno.env.get('EVERYPAY_API_SECRET')!

  const res = await fetch(`${apiUrl}/payments/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: 'Basic ' + btoa(`${apiUsername}:${apiSecret}`),
    },
    body: JSON.stringify({
      api_username: apiUsername,
      payment_reference: paymentReference,
      amount: (amountCents / 100).toFixed(2),
      nonce: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(`Refund failed: ${data?.error?.message || res.statusText}`)
  }
}
