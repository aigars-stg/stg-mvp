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
  infoBox,
  infoTitle,
  infoText,
  buttonContainer,
  button,
  footer,
} from '@/lib/email/styles';

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

