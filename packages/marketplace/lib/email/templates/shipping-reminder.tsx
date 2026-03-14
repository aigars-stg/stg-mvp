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
  orderBoxOrange,
  warningBox,
  buttonContainer,
  buttonOrange,
} from '@/lib/email/styles';

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

          <Section style={orderBoxOrange}>
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
            <Button style={buttonOrange} href={`https://secondturn.games/orders/${orderId}`}>
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

