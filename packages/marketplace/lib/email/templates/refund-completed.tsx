import {
  Body,
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

interface RefundCompletedEmailProps {
  buyerName: string;
  orderNumber: string;
  refundAmount: string;
  refundMethod: 'card' | 'bank' | 'wallet';
}

const REFUND_METHOD_LABELS: Record<string, string> = {
  card: 'Original payment card',
  bank: 'Bank transfer',
  wallet: 'Second Turn wallet',
};

const REFUND_TIMELINE: Record<string, string> = {
  card: 'Please allow 3-10 business days for the refund to appear on your card statement, depending on your bank.',
  bank: 'The transfer has been initiated and should arrive within 1-3 business days.',
  wallet: 'The funds have been credited to your Second Turn wallet and are available immediately.',
};

export const RefundCompletedEmail = ({
  buyerName = 'Buyer',
  orderNumber = 'ORD-2025-001234',
  refundAmount = '24.99',
  refundMethod = 'card',
}: RefundCompletedEmailProps) => {
  const previewText = `Your refund of \u20AC${refundAmount} for Order #${orderNumber} is complete`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Refund Complete</Heading>

          <Text style={text}>Hi {buyerName},</Text>

          <Text style={text}>
            Your refund for Order #{orderNumber} has been processed
            successfully.
          </Text>

          <Section style={successBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
            <Hr style={hr} />
            <table style={detailsTable}>
              <tr>
                <td style={label}>Refund amount:</td>
                <td style={amountValue}>&euro;{refundAmount}</td>
              </tr>
              <tr>
                <td style={label}>Refunded to:</td>
                <td style={value}>
                  {REFUND_METHOD_LABELS[refundMethod] || refundMethod}
                </td>
              </tr>
            </table>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>When to expect your funds</Text>
            <Text style={infoText}>{REFUND_TIMELINE[refundMethod]}</Text>
          </Section>

          <Text style={text}>
            If you have any questions about this refund, reply to this email and
            our team will be happy to help.
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

export default RefundCompletedEmail;

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
  paddingBottom: '12px',
};

const amountValue = {
  color: '#a3be8c',
  fontSize: '20px',
  fontWeight: '700',
  paddingBottom: '12px',
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

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '32px 40px 0',
  textAlign: 'center' as const,
};
