/**
 * Bookkeeping utility functions for VAT calculations, date ranges, and CSV export
 * Used by the Staff Dashboard Bookkeeping view
 */

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
  service_fee: number;
  shipping_cost: number;
  total_amount: number;
  buyer_name: string;
  seller_name: string;
}

/** Aggregated bookkeeping summary for a set of orders */
export interface BookkeepingSummary {
  /** Number of orders included in calculations (excludes cancelled/refunded) */
  orderCount: number;
  /** Gross Merchandise Value - sum of items_total */
  gmv: number;
  /** Total buyer paid - sum of total_amount */
  totalBuyerPaid: number;
  /** Platform fee breakdown (service_fee) */
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
 * Extract VAT from a VAT-inclusive (gross) amount
 * Formula: VAT = gross × (rate / (1 + rate))
 *
 * @param grossAmount - VAT-inclusive amount in EUR
 * @returns Breakdown with gross, net, and VAT amounts (rounded to 2 decimal places)
 *
 * @example
 * extractVatFromGross(2.00)  // { gross: 2.00, net: 1.65, vat: 0.35 }
 * extractVatFromGross(1.58)  // { gross: 1.58, net: 1.31, vat: 0.27 }
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
  let totalServiceFee = 0;
  let totalShipping = 0;

  for (const order of validOrders) {
    gmv += order.items_total;
    totalBuyerPaid += order.total_amount;
    totalServiceFee += order.service_fee;
    totalShipping += order.shipping_cost;
  }

  const platformRevenue = extractVatFromGross(totalServiceFee);
  const shippingRevenue = extractVatFromGross(totalShipping);
  const totalVatCollected = platformRevenue.vat + shippingRevenue.vat;

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
    'Platform Fee Gross (EUR)',
    'Platform Fee Net (EUR)',
    'Platform Fee VAT (EUR)',
    'Shipping Gross (EUR)',
    'Shipping Net (EUR)',
    'Shipping VAT (EUR)',
    'Total VAT (EUR)',
    'Buyer Paid (EUR)',
  ];

  const rows = orders.map((order) => {
    const platformFee = extractVatFromGross(order.service_fee);
    const shipping = extractVatFromGross(order.shipping_cost);
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
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Convert a Date to ISO string for API requests
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString();
}
