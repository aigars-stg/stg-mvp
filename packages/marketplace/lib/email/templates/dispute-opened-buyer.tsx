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

interface DisputeOpenedBuyerEmailProps {
  buyerName: string;
  orderNumber: string;
  disputeType: string;
  orderId: string;
}

const DISPUTE_TYPE_LABELS: Record<string, string> = {
  not_as_described: 'Item not as described',
  missing_parts: 'Missing parts or components',
  damaged: 'Item arrived damaged',
  wrong_item: 'Wrong item received',
  not_received: 'Item not received',
};

export const DisputeOpenedBuyerEmail = ({
  buyerName = 'Buyer',
  orderNumber = 'ORD-2025-001234',
  disputeType = 'not_as_described',
  orderId = '123',
}: DisputeOpenedBuyerEmailProps) => {
  const previewText = `We've received your report for Order #${orderNumber}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Report Received</Heading>

          <Text style={text}>Hi {buyerName},</Text>

          <Text style={text}>
            We have received your report for Order #{orderNumber}. Our team
            takes every report seriously and will work to resolve this fairly.
          </Text>

          <Section style={orderBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
            <Hr style={hr} />
            <table style={detailsTable}>
              <tr>
                <td style={label}>Issue:</td>
                <td style={value}>
                  {DISPUTE_TYPE_LABELS[disputeType] || disputeType}
                </td>
              </tr>
            </table>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>What happens next</Text>
            <Text style={infoText}>
              <strong>1.</strong> The seller has been notified and has{' '}
              <strong>48 hours</strong> to respond
              <br />
              <strong>2.</strong> If the seller does not respond in time, the
              case will proceed to review without their input
              <br />
              <strong>3.</strong> Our team will review both sides and reach a
              fair resolution
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

export default DisputeOpenedBuyerEmail;

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

const value = {
  color: '#2e3a4d',
  fontSize: '16px',
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
