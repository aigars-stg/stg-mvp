import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import * as React from 'react';
import { formatPrice } from '@/lib/services/pricing';

interface OrderCancelledBuyerEmailProps {
  buyerName: string;
  orderNumber: string;
  sellerName: string;
  refundAmount: number;
  cancellationReason: string;
  browseUrl?: string;
}

export const OrderCancelledBuyerEmail = ({
  buyerName = 'Buyer',
  orderNumber = 'ORD-2025-001234',
  sellerName = 'Seller',
  refundAmount = 65.5,
  cancellationReason = 'Seller did not respond within 24 hours',
  browseUrl = 'https://secondturn.games/browse',
}: OrderCancelledBuyerEmailProps) => {
  const previewText = `Order #${orderNumber} has been cancelled - Full refund processed`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Order Cancelled</Heading>

          <Text style={text}>Hi {buyerName},</Text>

          <Text style={text}>
            We&apos;re sorry to inform you that your order from <strong>{sellerName}</strong> has been
            cancelled.
          </Text>

          <Section style={orderBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
            <Hr style={hr} />

            <table style={detailsTable}>
              <tr>
                <td style={label}>Reason:</td>
                <td style={value}>{cancellationReason}</td>
              </tr>
              <tr>
                <td style={label}>Refund Amount:</td>
                <td style={refundValue}>{formatPrice(refundAmount)}</td>
              </tr>
            </table>
          </Section>

          <Section style={refundBox}>
            <Text style={refundTitle}>💰 Refund Processed</Text>
            <Text style={refundText}>
              A full refund of <strong>{formatPrice(refundAmount)}</strong> has been automatically
              processed to your original payment method. You should see it in your account within
              5-10 business days.
            </Text>
          </Section>

          <Text style={text}>
            We apologize for the inconvenience. Feel free to browse our marketplace for other great
            board games!
          </Text>

          {browseUrl && (
            <Section style={buttonContainer}>
              <Button style={button} href={browseUrl}>
                Browse Games
              </Button>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            Second Turn - Board Game Marketplace
            <br />
            Questions about your refund? Reply to this email
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default OrderCancelledBuyerEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
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

const orderBox = {
  backgroundColor: '#f8fafc',
  border: '2px solid #d08770',
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

const hr = {
  borderColor: '#e6ebf1',
  margin: '16px 0',
};

const detailsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
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

const refundValue = {
  color: '#a3be8c',
  fontSize: '20px',
  fontWeight: '600',
  paddingBottom: '12px',
};

const refundBox = {
  backgroundColor: '#e6ffe6',
  border: '1px solid #a3be8c',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '20px',
};

const refundTitle = {
  color: '#2e3a4d',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const refundText = {
  color: '#525f7f',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const buttonContainer = {
  margin: '32px 40px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#8fbcbb',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '32px 40px 0',
  textAlign: 'center' as const,
};
