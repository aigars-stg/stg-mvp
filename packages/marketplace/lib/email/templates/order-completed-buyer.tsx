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
import {
  main,
  container,
  h1,
  text,
  orderBox,
  orderNumberStyle,
  hr,
  infoBox,
  infoTitle,
  infoText,
  buttonContainer,
  button,
  footer,
} from '@/lib/email/styles';

interface OrderCompletedBuyerEmailProps {
  buyerName: string;
  orderNumber: string;
  sellerName: string;
  orderUrl: string;
  reviewUrl: string;
}

export const OrderCompletedBuyerEmail = ({
  buyerName = 'Buyer',
  orderNumber = 'ORD-2025-001234',
  sellerName = 'Seller',
  orderUrl = 'https://secondturn.games/orders/123',
  reviewUrl = 'https://secondturn.games/orders/123/review',
}: OrderCompletedBuyerEmailProps) => {
  const previewText = `Order #${orderNumber} is complete - leave a review for ${sellerName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Order Complete</Heading>

          <Text style={text}>Hi {buyerName},</Text>

          <Text style={text}>
            Your order has been finalized. We hope you enjoy your new game.
          </Text>

          <Section style={orderBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>Leave a review</Text>
            <Text style={infoText}>
              Help other buyers by sharing your experience with {sellerName}.
              Reviews build trust in the community.
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={reviewUrl}>
              Leave a Review
            </Button>
          </Section>

          <Text style={{ ...text, fontSize: '14px', color: '#666' }}>
            Or <a href={orderUrl} style={{ color: '#88C0D0' }}>view your order details</a>
          </Text>

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

export default OrderCompletedBuyerEmail;
