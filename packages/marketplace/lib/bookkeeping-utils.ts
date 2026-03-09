/**
 * Bookkeeping utility functions for VAT calculations, date ranges, and CSV export
 * Used by the Staff Dashboard Bookkeeping view
 */

import { formatPrice } from '@/lib/services/pricing';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Latvia standard VAT rate */
export const LATVIA_VAT_RATE = 0.21;

/** Multiplier to extract VAT from a VAT-inclusive amount: rate / (1 + rate) */
export const VAT_MULTIPLIER = LATVIA_VAT_RATE / (1 + LATVIA_VAT_RATE); // ~0.1736

/** Order statuses to exclude from financial totals (but still show in table) */
export const EXCLUDED_FROM_TOTALS = ['cancelled', 'refunded'];

// ============================================================================
// INTERFACES
// ============================================================================

/** VAT breakdown for a single amount */
export interface VATBreakdown {
  /** Original VAT-inclusive amount */
  gross: number;
  /** Amount without VAT */
  net: number;
  /** VAT amount */
  vat: number;
}

/** Order data needed for bookkeeping calculations */
export interface OrderBookkeepingData {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  items_total: number;
  platform_commission_cents: number;
  shipping_cost: number;
  total_amount: number;
  buyer_name: string;
  seller_name: string;
  // Per-order stored VAT columns (null for legacy orders pre-migration)
  commission_net_cents: number | null;
  commission_vat_cents: number | null;
  commission_vat_rate: number | null;
  shipping_net_cents: number | null;
  shipping_vat_cents: number | null;
  shipping_vat_rate: number | null;
}

/** Aggregated bookkeeping summary for a set of orders */
export interface BookkeepingSummary {
  /** Number of orders included in calculations (excludes cancelled/refunded) */
  orderCount: number;
  /** Gross Merchandise Value - sum of items_total */
  gmv: number;
  /** Total buyer paid - sum of total_amount */
  totalBuyerPaid: number;
  /** Platform commission breakdown (10% of items_total) */
  platformRevenue: VATBreakdown;
  /** Shipping revenue breakdown (shipping_cost) */
  shippingRevenue: VATBreakdown;
  /** Total VAT collected (platform fee VAT + shipping VAT) */
  totalVatCollected: number;
}

/** Date range preset configuration */
export interface DateRangePreset {
  key: string;
  label: string;
  getRange: () => { start: Date; end: Date };
}

// ============================================================================
// DATE RANGE PRESETS
// ============================================================================

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  {
    key: 'today',
    label: 'Today',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end };
    },
  },
  {
    key: 'yesterday',
    label: 'Yesterday',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      return { start, end };
    },
  },
  {
    key: 'this_week',
    label: 'This Week',
    getRange: () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      // Monday = 0, Sunday = 6 (ISO week)
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end };
    },
  },
  {
    key: 'last_week',
    label: 'Last Week',
    getRange: () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff - 7, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff - 1, 23, 59, 59, 999);
      return { start, end };
    },
  },
  {
    key: 'this_month',
    label: 'This Month',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    },
  },
  {
    key: 'last_month',
    label: 'Last Month',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    },
  },
  {
    key: 'this_quarter',
    label: 'This Quarter',
    getRange: () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
      return { start, end };
    },
  },
  {
    key: 'this_year',
    label: 'This Year',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start, end };
    },
  },
];

// ============================================================================
// VAT CALCULATION FUNCTIONS
// ============================================================================

/**
 * Extract VAT from a VAT-inclusive (gross) amount using Latvia's default rate.
 * Legacy fallback for orders without stored VAT columns.
 *
 * @param grossAmount - VAT-inclusive amount in EUR
 * @returns Breakdown with gross, net, and VAT amounts (rounded to 2 decimal places)
 */
export function extractVatFromGross(grossAmount: number): VATBreakdown {
  const vat = grossAmount * VAT_MULTIPLIER;
  const net = grossAmount - vat;
  return {
    gross: Math.round(grossAmount * 100) / 100,
    net: Math.round(net * 100) / 100,
    vat: Math.round(vat * 100) / 100,
  };
}

/**
 * Resolve VAT breakdown from stored per-order columns, falling back to
 * Latvia-rate calculation for legacy orders (pre-VAT-column migration).
 */
export function resolveVatBreakdown(
  grossEuros: number,
  storedNetCents: number | null,
  storedVatCents: number | null,
): VATBreakdown {
  if (storedNetCents != null) {
    return {
      gross: grossEuros,
      net: storedNetCents / 100,
      vat: (storedVatCents ?? 0) / 100,
    };
  }
  return extractVatFromGross(grossEuros);
}

// ============================================================================
// AGGREGATION FUNCTIONS
// ============================================================================

/**
 * Calculate bookkeeping summary from a list of orders
 * Excludes cancelled/refunded orders from financial calculations
 *
 * @param orders - Array of orders with bookkeeping data
 * @returns Aggregated summary with GMV, revenue breakdowns, and VAT totals
 */
export function calculateBookkeepingSummary(orders: OrderBookkeepingData[]): BookkeepingSummary {
  // Filter to only include orders that count towards financial totals
  const validOrders = orders.filter((o) => !EXCLUDED_FROM_TOTALS.includes(o.status));

  let gmv = 0;
  let totalBuyerPaid = 0;
  const platformRevenue: VATBreakdown = { gross: 0, net: 0, vat: 0 };
  const shippingRevenue: VATBreakdown = { gross: 0, net: 0, vat: 0 };

  for (const order of validOrders) {
    gmv += order.items_total;
    totalBuyerPaid += order.total_amount;

    const commission = resolveVatBreakdown(
      order.platform_commission_cents / 100, order.commission_net_cents, order.commission_vat_cents
    );
    platformRevenue.gross += commission.gross;
    platformRevenue.net += commission.net;
    platformRevenue.vat += commission.vat;

    const shipping = resolveVatBreakdown(
      order.shipping_cost, order.shipping_net_cents, order.shipping_vat_cents
    );
    shippingRevenue.gross += shipping.gross;
    shippingRevenue.net += shipping.net;
    shippingRevenue.vat += shipping.vat;
  }

  // Round aggregated values to 2 decimal places
  platformRevenue.gross = Math.round(platformRevenue.gross * 100) / 100;
  platformRevenue.net = Math.round(platformRevenue.net * 100) / 100;
  platformRevenue.vat = Math.round(platformRevenue.vat * 100) / 100;
  shippingRevenue.gross = Math.round(shippingRevenue.gross * 100) / 100;
  shippingRevenue.net = Math.round(shippingRevenue.net * 100) / 100;
  shippingRevenue.vat = Math.round(shippingRevenue.vat * 100) / 100;

  const totalVatCollected = Math.round((platformRevenue.vat + shippingRevenue.vat) * 100) / 100;

  return {
    orderCount: validOrders.length,
    gmv,
    totalBuyerPaid,
    platformRevenue,
    shippingRevenue,
    totalVatCollected,
  };
}

// ============================================================================
// CSV EXPORT FUNCTIONS
// ============================================================================

/**
 * Escape a value for CSV output
 * Wraps in quotes if contains comma, quote, or newline; escapes quotes by doubling
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate CSV content from orders for bookkeeping export
 *
 * @param orders - Array of orders with bookkeeping data
 * @returns CSV string ready for download
 */
export function generateBookkeepingCSV(orders: OrderBookkeepingData[]): string {
  const headers = [
    'Order Number',
    'Date',
    'Status',
    'Buyer',
    'Seller',
    'Game Price (EUR)',
    'Commission Gross (EUR)',
    'Commission Net (EUR)',
    'Commission VAT (EUR)',
    'Shipping Gross (EUR)',
    'Shipping Net (EUR)',
    'Shipping VAT (EUR)',
    'Total VAT (EUR)',
    'Buyer Paid (EUR)',
    'VAT Rate',
  ];

  const rows = orders.map((order) => {
    const platformFee = resolveVatBreakdown(
      order.platform_commission_cents / 100, order.commission_net_cents, order.commission_vat_cents
    );
    const shipping = resolveVatBreakdown(
      order.shipping_cost, order.shipping_net_cents, order.shipping_vat_cents
    );
    const vatRate = order.commission_vat_rate ?? LATVIA_VAT_RATE;
    const totalVat = platformFee.vat + shipping.vat;
    const date = order.paid_at
      ? new Date(order.paid_at).toISOString().split('T')[0]
      : new Date(order.created_at).toISOString().split('T')[0];

    return [
      escapeCSVValue(order.order_number),
      date,
      order.status,
      escapeCSVValue(order.buyer_name),
      escapeCSVValue(order.seller_name),
      order.items_total.toFixed(2),
      platformFee.gross.toFixed(2),
      platformFee.net.toFixed(2),
      platformFee.vat.toFixed(2),
      shipping.gross.toFixed(2),
      shipping.net.toFixed(2),
      shipping.vat.toFixed(2),
      totalVat.toFixed(2),
      order.total_amount.toFixed(2),
      (vatRate * 100).toFixed(0) + '%',
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Trigger a CSV file download in the browser
 *
 * @param content - CSV string content
 * @param filename - Name for the downloaded file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format a number as Euro currency
 *
 * @param amount - Amount in EUR
 * @returns Formatted string like "€25.50"
 */
export function formatEuros(amount: number): string {
  return formatPrice(amount);
}

/**
 * Convert a Date to ISO string for API requests
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString();
}
