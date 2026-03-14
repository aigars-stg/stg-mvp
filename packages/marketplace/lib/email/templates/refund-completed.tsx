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
import {
  main,
  container,
  h1,
  text,
  hr,
  footer,
  orderNumberStyle,
  detailsTable,
  infoBox,
  infoText,
} from '@/lib/email/styles';

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
  paddingBottom: '12px',
};

const amountValue = {
  color: '#a3be8c',
  fontSize: '20px',
  fontWeight: '700',
  paddingBottom: '12px',
};

const infoTitle = {
  color: '#2e3a4d',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

