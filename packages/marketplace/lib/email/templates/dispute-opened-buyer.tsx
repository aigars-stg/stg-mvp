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
  orderNumberStyle,
  detailsTable,
  infoBox,
  infoText,
  buttonContainer,
  buttonOrange,
} from '@/lib/email/styles';

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

          <Section style={orderBoxOrange}>
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

export default DisputeOpenedBuyerEmail;

// Template-specific styles (differ from shared)
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

const infoTitle = {
  color: '#2e3a4d',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};
