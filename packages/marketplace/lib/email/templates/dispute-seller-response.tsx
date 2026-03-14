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
  hr,
  footer,
  orderBoxOrange,
  infoBox,
  infoText,
  buttonContainer,
  buttonOrange,
} from '@/lib/email/styles';

interface DisputeSellerResponseEmailProps {
  buyerName: string;
  orderNumber: string;
  orderId: string;
}

export const DisputeSellerResponseEmail = ({
  buyerName = 'Buyer',
  orderNumber = 'ORD-2025-001234',
  orderId = '123',
}: DisputeSellerResponseEmailProps) => {
  const previewText = `The seller has responded to your report for Order #${orderNumber}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Seller Has Responded</Heading>

          <Text style={text}>Hi {buyerName},</Text>

          <Text style={text}>
            The seller has submitted their response regarding your report for
            Order #{orderNumber}.
          </Text>

          <Section style={orderBoxOrange}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>What happens next</Text>
            <Text style={infoText}>
              Our team will now review both sides of the case. We aim to reach
              a fair resolution as quickly as possible. You will receive an
              email once a decision has been made.
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={buttonOrange} href={`https://secondturn.games/orders/${orderId}`}>
              View Order Details
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

export default DisputeSellerResponseEmail;

// Template-specific styles (differ from shared)
const orderNumberStyle = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#2e3a4d',
  margin: '0',
};

const infoTitle = {
  color: '#2e3a4d',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};
