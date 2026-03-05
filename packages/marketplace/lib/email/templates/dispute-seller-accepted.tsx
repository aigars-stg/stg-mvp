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
            <Button style={button} href={`https://secondturn.games/orders/${orderId}`}>
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

const successBox = {
  backgroundColor: '#e6ffe6',
  border: '2px solid #a3be8c',
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
  width: '120px',
  verticalAlign: 'top' as const,
};

const value = {
  color: '#2e3a4d',
  fontSize: '16px',
  fontWeight: '600',
  paddingBottom: '12px',
};

const buttonContainer = {
  margin: '32px 40px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#a3be8c',
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
