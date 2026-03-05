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

interface ShippingReminderEmailProps {
  sellerName: string;
  orderNumber: string;
  deadline: string;
  orderId: string;
}

export const ShippingReminderEmail = ({
  sellerName = 'Seller',
  orderNumber = 'ORD-2025-001234',
  deadline = '07.03.2026 14:00',
  orderId = '123',
}: ShippingReminderEmailProps) => {
  const previewText = `Reminder: please ship Order #${orderNumber} by ${deadline}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Shipping Reminder</Heading>

          <Text style={text}>Hi {sellerName},</Text>

          <Text style={text}>
            This is a friendly reminder that Order #{orderNumber} is waiting to
            be shipped. Please ship by <strong>{deadline}</strong> to avoid
            automatic cancellation.
          </Text>

          <Section style={orderBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
            <Hr style={hr} />
            <table style={detailsTable}>
              <tr>
                <td style={label}>Ship by:</td>
                <td style={deadlineValue}>{deadline}</td>
              </tr>
            </table>
          </Section>

          <Section style={warningBox}>
            <Text style={warningTitle}>Please note</Text>
            <Text style={warningText}>
              If the order is not shipped by the deadline, it will be
              automatically cancelled and the buyer will receive a full refund.
              This may also affect your seller rating.
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={`https://secondturn.games/orders/${orderId}`}>
              View Order &amp; Ship
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

export default ShippingReminderEmail;

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

const deadlineValue = {
  color: '#d08770',
  fontSize: '18px',
  fontWeight: '700',
  paddingBottom: '12px',
};

const warningBox = {
  backgroundColor: '#fff8e1',
  border: '1px solid #d08770',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '20px',
};

const warningTitle = {
  color: '#2e3a4d',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const warningText = {
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
