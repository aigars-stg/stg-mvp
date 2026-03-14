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
  warningBox,
  buttonContainer,
  buttonOrange,
} from '@/lib/email/styles';

interface DisputeOpenedSellerEmailProps {
  sellerName: string;
  orderNumber: string;
  gameName: string;
  buyerReason: string;
  deadlineHours: number;
  respondUrl: string;
}

export const DisputeOpenedSellerEmail = ({
  sellerName = 'Seller',
  orderNumber = 'ORD-2025-001234',
  gameName = 'Board Game',
  buyerReason = 'Item not as described',
  deadlineHours = 48,
  respondUrl = 'https://secondturn.games/orders/123',
}: DisputeOpenedSellerEmailProps) => {
  const previewText = `Action required: Dispute opened for Order #${orderNumber}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Dispute Opened</Heading>

          <Text style={text}>Hi {sellerName},</Text>

          <Text style={text}>
            A buyer has opened a dispute for your order. You have{' '}
            <strong>{deadlineHours} hours</strong> to respond with your side of
            the story.
          </Text>

          <Section style={orderBoxOrange}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
            <Hr style={hr} />
            <table style={detailsTable}>
              <tr>
                <td style={label}>Item:</td>
                <td style={value}>{gameName}</td>
              </tr>
              <tr>
                <td style={label}>Reason:</td>
                <td style={value}>{buyerReason}</td>
              </tr>
            </table>
          </Section>

          <Section style={warningBox}>
            <Text style={warningTitle}>What happens next</Text>
            <Text style={warningText}>
              If you do not respond within {deadlineHours} hours, the dispute
              will proceed to review without your input. Responding with
              detailed information and photos helps our team make a fair
              decision.
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={buttonOrange} href={respondUrl}>
              View Dispute &amp; Respond
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

export default DisputeOpenedSellerEmail;

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
