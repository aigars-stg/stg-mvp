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

interface OrderPlacedSellerEmailProps {
  sellerName: string;
  orderNumber: string;
  itemCount: number;
  totalAmount: number;
  buyerName: string;
  shippingMethod: 't2t' | 'local_pickup';
  destinationInfo: string; // Terminal name or pickup city
  orderUrl: string;
  deadlineHours: number;
}

export const OrderPlacedSellerEmail = ({
  sellerName = 'Seller',
  orderNumber = 'ORD-2025-001234',
  itemCount = 2,
  totalAmount = 65.5,
  buyerName = 'Buyer',
  shippingMethod = 't2t',
  destinationInfo = 'Vilnius Akropolis',
  orderUrl = 'https://secondturn.games/seller/orders/123',
  deadlineHours = 24,
}: OrderPlacedSellerEmailProps) => {
  const previewText = `New order #${orderNumber} - Action required within ${deadlineHours} hours`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🎉 New Order!</Heading>

          <Text style={text}>Hi {sellerName},</Text>

          <Text style={text}>
            You have a new order! Please respond within <strong>{deadlineHours} hours</strong>.
          </Text>

          <Section style={orderBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
            <Hr style={hr} />

            <table style={detailsTable}>
              <tr>
                <td style={label}>Items:</td>
                <td style={value}>{itemCount} game{itemCount !== 1 ? 's' : ''}</td>
              </tr>
              <tr>
                <td style={label}>Total:</td>
                <td style={value}>€{totalAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={label}>Buyer:</td>
                <td style={value}>{buyerName}</td>
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

          <Section style={buttonContainer}>
            <Button style={button} href={orderUrl}>
              View Order & Respond
            </Button>
          </Section>

          <Section style={warningBox}>
            <Text style={warningText}>
              ⚠️ <strong>Important:</strong> If you don't respond within {deadlineHours} hours,
              the order will be automatically cancelled and the buyer will be refunded.
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Second Turn - Board Game Marketplace
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default OrderPlacedSellerEmail;

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
  border: '2px solid #8fbcbb',
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

const warningBox = {
  backgroundColor: '#fff9e6',
  border: '1px solid #ffd966',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '16px',
};

const warningText = {
  color: '#6b5e00',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '32px 40px 0',
  textAlign: 'center' as const,
};
