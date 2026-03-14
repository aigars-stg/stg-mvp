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
  orderNumberStyle,
  detailsTable,
  buttonContainer,
  buttonGreen,
} from '@/lib/email/styles';

interface DisputeSellerAcceptedEmailProps {
  buyerName: string;
  orderNumber: string;
  refundAmount: string;
  orderId: string;
}

export const DisputeSellerAcceptedEmail = ({
  buyerName = 'Buyer',
  orderNumber = 'ORD-2025-001234',
  refundAmount = '24.99',
  orderId = '123',
}: DisputeSellerAcceptedEmailProps) => {
  const previewText = `Good news — your refund for Order #${orderNumber} is being processed`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Refund Being Processed</Heading>

          <Text style={text}>Hi {buyerName},</Text>

          <Text style={text}>
            Good news — the seller has accepted your claim for Order #
            {orderNumber}. Your refund is now being processed.
          </Text>

          <Section style={successBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
            <Hr style={hr} />
            <table style={detailsTable}>
              <tr>
                <td style={label}>Refund amount:</td>
                <td style={value}>&euro;{refundAmount}</td>
              </tr>
              <tr>
                <td style={label}>Status:</td>
                <td style={value}>Processing</td>
              </tr>
            </table>
          </Section>

          <Text style={text}>
            You will receive a separate confirmation once the refund has been
            completed, including details on when to expect the funds.
          </Text>

          <Section style={buttonContainer}>
            <Button style={buttonGreen} href={`https://secondturn.games/orders/${orderId}`}>
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

export default DisputeSellerAcceptedEmail;

// Template-specific styles (differ from shared)
const successBox = {
  backgroundColor: '#e6ffe6',
  border: '2px solid #a3be8c',
  borderRadius: '12px',
  margin: '24px 40px',
  padding: '24px',
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
  fontWeight: '600',
  paddingBottom: '12px',
};
