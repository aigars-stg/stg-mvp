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

          <Section style={orderBox}>
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

export default DisputeSellerResponseEmail;

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
  margin: '0',
};

const hr = { borderColor: '#e6ebf1', margin: '16px 0' };

const infoBox = {
  backgroundColor: '#e6f7ff',
  border: '1px solid #88C0D0',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '20px',
};

const infoTitle = {
  color: '#2e3a4d',
  fontSize: '18px',
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
  backgroundColor: '#d08770',
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
