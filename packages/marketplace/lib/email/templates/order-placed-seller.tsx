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
  orderBox,
  orderNumberStyle,
  hr,
  detailsTable,
  label,
  value,
  buttonContainer,
  button,
} from '@/lib/email/styles';

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
  orderUrl = 'https://secondturn.games/orders/123',
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
                <td style={value}>{formatPrice(totalAmount)}</td>
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
              ⚠️ <strong>Important:</strong> If you don&apos;t respond within {deadlineHours} hours,
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

// Template-specific styles
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
