/**
 * Shared email template styles
 *
 * These styles are used across all React Email templates.
 * React Email requires inline style objects (no Tailwind).
 *
 * Brand colors:
 * - Frost Ice:     #88C0D0
 * - Aurora Orange:  #D08770
 * - Aurora Green:   #a3be8c
 * - Polar Night:    #2e3a4d
 * - Text body:      #525f7f
 * - Text muted:     #8898aa
 * - Border:         #e6ebf1
 */

// ── Core layout (identical in every template) ──────────────────────────

export const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

export const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

export const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 40px',
};

export const hr = {
  borderColor: '#e6ebf1',
  margin: '16px 0',
};

export const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '32px 40px 0',
  textAlign: 'center' as const,
};

// ── Headings ───────────────────────────────────────────────────────────

export const h1 = {
  color: '#2e3a4d',
  fontSize: '32px',
  fontWeight: '700',
  margin: '40px 0',
  padding: '0 40px',
};

export const h1Small = {
  ...h1,
  fontSize: '28px',
  margin: '40px 0 16px',
};

// ── Buttons ────────────────────────────────────────────────────────────

export const buttonContainer = {
  margin: '32px 40px',
  textAlign: 'center' as const,
};

const buttonBase = {
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
};

export const button = { ...buttonBase, backgroundColor: '#88C0D0' };
export const buttonOrange = { ...buttonBase, backgroundColor: '#D08770' };
export const buttonGreen = { ...buttonBase, backgroundColor: '#a3be8c' };
export const buttonDark = { ...buttonBase, backgroundColor: '#4c566a' };

// ── Order detail table ─────────────────────────────────────────────────

export const detailsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

export const label = {
  color: '#6b7c93',
  fontSize: '14px',
  paddingBottom: '8px',
  width: '120px',
};

export const value = {
  color: '#2e3a4d',
  fontSize: '16px',
  fontWeight: '500',
  paddingBottom: '8px',
};

// ── Highlight boxes ────────────────────────────────────────────────────

export const infoBox = {
  backgroundColor: '#e6f7ff',
  border: '1px solid #88C0D0',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '20px',
};

export const warningBox = {
  backgroundColor: '#fff8e1',
  border: '1px solid #d08770',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '20px',
};

export const infoTitle = {
  color: '#2e3a4d',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

export const infoText = {
  color: '#525f7f',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

// ── Order box ──────────────────────────────────────────────────────────

const orderBoxBase = {
  backgroundColor: '#f8fafc',
  borderRadius: '12px',
  margin: '24px 40px',
  padding: '24px',
};

export const orderBox = { ...orderBoxBase, border: '2px solid #88C0D0' };
export const orderBoxOrange = { ...orderBoxBase, border: '2px solid #d08770' };
export const orderBoxGreen = { ...orderBoxBase, border: '2px solid #a3be8c' };
export const orderBoxNeutral = { ...orderBoxBase, border: '1px solid #e6ebf1' };

export const orderNumberStyle = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#2e3a4d',
  margin: '0 0 16px 0',
};
