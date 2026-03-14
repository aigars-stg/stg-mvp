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

interface DisputeEscalatedStaffEmailProps {
  orderNumber: string;
  orderId: string;
  reason: string;
  buyerName: string;
  sellerName: string;
  totalAmountEuros: string;
  escalationReason: 'seller_contested' | 'seller_deadline_expired';
}

export const DisputeEscalatedStaffEmail = ({
  orderNumber = 'ORD-2025-001234',
  orderId = '00000000-0000-0000-0000-000000000000',
  reason = 'Item not as described',
  buyerName = 'Buyer',
  sellerName = 'Seller',
  totalAmountEuros = '24.99',
  escalationReason = 'seller_contested',
}: DisputeEscalatedStaffEmailProps) => {
  const previewText = `Dispute needs review: Order #${orderNumber}`;
  const adminUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

  const escalationLabel = escalationReason === 'seller_contested'
    ? 'Seller contested the claim'
    : 'Seller did not respond within 48 hours';

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Dispute Needs Review</Heading>

          <Text style={text}>
            A dispute has been escalated and requires your decision.
          </Text>

          <Section style={alertBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
            <Hr style={hr} />
            <table style={detailsTable}>
              <tr>
                <td style={label}>Dispute reason:</td>
                <td style={value}>{reason}</td>
              </tr>
              <tr>
                <td style={label}>Escalated because:</td>
                <td style={highlightValue}>{escalationLabel}</td>
              </tr>
              <tr>
                <td style={label}>Buyer:</td>
                <td style={value}>{buyerName}</td>
              </tr>
              <tr>
                <td style={label}>Seller:</td>
                <td style={value}>{sellerName}</td>
              </tr>
              <tr>
                <td style={label}>Order total:</td>
                <td style={value}>&euro;{totalAmountEuros}</td>
              </tr>
            </table>
          </Section>

          <Text style={text}>
            Review the dispute details and make a resolution decision in the{' '}
            <Link href={`${adminUrl}/staff/disputes/${orderId}`}>
              staff dashboard
            </Link>.
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

export default DisputeEscalatedStaffEmail;

// Template-specific styles (differ from shared)
const alertBox = {
  backgroundColor: '#fff3e0',
  border: '2px solid #e8a838',
  borderRadius: '12px',
  margin: '24px 40px',
  padding: '24px',
};

const label = {
  color: '#6b7c93',
  fontSize: '14px',
  paddingBottom: '12px',
  width: '140px',
  verticalAlign: 'top' as const,
};

const value = {
  color: '#2e3a4d',
  fontSize: '16px',
  paddingBottom: '12px',
};

const highlightValue = {
  color: '#e8a838',
  fontSize: '16px',
  fontWeight: '600',
  paddingBottom: '12px',
};
