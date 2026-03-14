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
import {
  main,
  container,
  h1,
  text,
  orderBoxOrange,
  orderNumberStyle,
  hr,
  detailsTable,
  buttonContainer,
  button,
  footer,
} from '@/lib/email/styles';

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

          <Section style={orderBoxOrange}>
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

// Template-specific styles
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

