import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from '@react-email/components';
import * as React from 'react';
import {
  main,
  container,
  h1,
  text,
  hr,
  footer,
  orderNumberStyle,
  detailsTable,
} from '@/lib/email/styles';

interface ClawbackShortfallStaffEmailProps {
  orderNumber: string;
  orderId: string;
  sellerName: string;
  shortfallCents: number;
  availableCents: number;
  requiredCents: number;
  clawbackType: 'full' | 'partial';
}

export const ClawbackShortfallStaffEmail = ({
  orderNumber = 'ORD-2025-001234',
  orderId = '00000000-0000-0000-0000-000000000000',
  sellerName = 'Seller',
  shortfallCents = 500,
  availableCents = 300,
  requiredCents = 800,
  clawbackType = 'full',
}: ClawbackShortfallStaffEmailProps) => {
  const previewText = `Manual recovery required: seller wallet insufficient for clawback on Order #${orderNumber}`;
  const adminUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
  const formatEuros = (cents: number) => (cents / 100).toFixed(2);

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Wallet Clawback Shortfall</Heading>

          <Text style={text}>
            A {clawbackType} refund clawback failed because the seller has
            insufficient wallet balance. Manual recovery is required.
          </Text>

          <Section style={alertBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
            <Hr style={hr} />
            <table style={detailsTable}>
              <tr>
                <td style={label}>Seller:</td>
                <td style={value}>{sellerName}</td>
              </tr>
              <tr>
                <td style={label}>Required:</td>
                <td style={amountValue}>&euro;{formatEuros(requiredCents)}</td>
              </tr>
              <tr>
                <td style={label}>Available:</td>
                <td style={value}>&euro;{formatEuros(availableCents)}</td>
              </tr>
              <tr>
                <td style={label}>Shortfall:</td>
                <td style={shortfallValue}>&euro;{formatEuros(shortfallCents)}</td>
              </tr>
            </table>
          </Section>

          <Text style={text}>
            The buyer refund has been processed for the available portion. The
            shortfall of &euro;{formatEuros(shortfallCents)} needs to be recovered
            manually from the seller (e.g. via bank transfer request or deduction
            from future sales).
          </Text>

          <Text style={text}>
            Review the order in the{' '}
            <Link href={`${adminUrl}/admin/orders/${orderId}`}>
              admin dashboard
            </Link>
            .
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Second Turn - Internal Staff Notification
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default ClawbackShortfallStaffEmail;

const alertBox = {
  backgroundColor: '#fce4ec',
  border: '2px solid #e53935',
  borderRadius: '12px',
  margin: '24px 40px',
  padding: '24px',
};

const label = {
  color: '#6b7c93',
  fontSize: '14px',
  paddingBottom: '12px',
  width: '120px',
  verticalAlign: 'top' as const,
};

const value = {
  color: '#2e3a4d',
  fontSize: '16px',
  paddingBottom: '12px',
};

const amountValue = {
  color: '#e8a838',
  fontSize: '20px',
  fontWeight: '700',
  paddingBottom: '12px',
};

const shortfallValue = {
  color: '#e53935',
  fontSize: '20px',
  fontWeight: '700',
  paddingBottom: '12px',
};
