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

interface OrderConfirmationBuyerEmailProps {
  buyerName: string;
  orderNumber: string;
  sellerName: string;
  itemCount: number;
  totalAmount: number;
  shippingMethod: 't2t' | 'local_pickup';
  destinationInfo: string;
  orderUrl: string;
}

export const OrderConfirmationBuyerEmail = ({
  buyerName = 'Buyer',
  orderNumber = 'ORD-2025-001234',
  sellerName = 'Seller',
  itemCount = 2,
  totalAmount = 65.5,
  shippingMethod = 't2t',
  destinationInfo = 'Vilnius Akropolis',
  orderUrl = 'https://secondturn.games/orders/123',
}: OrderConfirmationBuyerEmailProps) => {
  const previewText = `Order #${orderNumber} - Payment successful, waiting for seller`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>✅ Order Placed Successfully!</Heading>

          <Text style={text}>Hi {buyerName},</Text>

          <Text style={text}>
            Your payment has been confirmed and your order is now waiting for the seller to respond.
          </Text>

          <Section style={orderBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
            <Hr style={hr} />

            <table style={detailsTable}>
              <tr>
                <td style={label}>Seller:</td>
                <td style={value}>{sellerName}</td>
              </tr>
              <tr>
                <td style={label}>Items:</td>
                <td style={value}>{itemCount} game{itemCount !== 1 ? 's' : ''}</td>
              </tr>
              <tr>
                <td style={label}>Total Paid:</td>
                <td style={value}>{formatPrice(totalAmount)}</td>
              </tr>
              <tr>
                <td style={label}>Delivery:</td>
                <td style={value}>
                  {shippingMethod === 't2t' ? '📦 Terminal: ' : '🤝 Local Pickup: '}
                  {destinationInfo}
                </td>
              </tr>
            </table>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>⏳ What happens next?</Text>
            <Text style={infoText}>
              <strong>1.</strong> The seller has 24 hours to accept your order
              <br />
              <strong>2.</strong> You&apos;ll receive an email once they respond
              <br />
              <strong>3.</strong> If they don&apos;t respond, you&apos;ll get an automatic full refund
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={orderUrl}>
              Track Your Order
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Second Turn - Board Game Marketplace
            <br />
            Questions? Reply to this email
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default OrderConfirmationBuyerEmail;

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
  border: '2px solid #88C0D0',
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
  paddingBottom: '8px',
  width: '120px',
};

const value = {
  color: '#2e3a4d',
  fontSize: '16px',
  fontWeight: '500',
  paddingBottom: '8px',
};

const infoBox = {
  backgroundColor: '#e6f7ff',
  border: '1px solid #88C0D0',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '20px',
};

const infoTitle = {
  color: '#2e3a4d',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const infoText = {
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
  backgroundColor: '#88C0D0',
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
