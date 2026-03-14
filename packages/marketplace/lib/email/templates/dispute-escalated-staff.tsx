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

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#2e3a4d',
  fontSize: '32px',
  fontWeight: '700',
  margin: '40px 0',
  padding: '0 40px',
};

const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 40px',
};

const alertBox = {
  backgroundColor: '#fff3e0',
  border: '2px solid #e8a838',
  borderRadius: '12px',
  margin: '24px 40px',
  padding: '24px',
};

const orderNumberStyle = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#2e3a4d',
  margin: '0 0 16px 0',
};

const hr = { borderColor: '#e6ebf1', margin: '16px 0' };

const detailsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
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

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '32px 40px 0',
  textAlign: 'center' as const,
};
