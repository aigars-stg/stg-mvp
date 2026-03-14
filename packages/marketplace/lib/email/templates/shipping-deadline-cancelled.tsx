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
  warningBox,
} from '@/lib/email/styles';

interface ShippingDeadlineCancelledEmailProps {
  recipientName: string;
  orderNumber: string;
  isBuyer: boolean;
}

export const ShippingDeadlineCancelledEmail = ({
  recipientName = 'User',
  orderNumber = 'ORD-2025-001234',
  isBuyer = true,
}: ShippingDeadlineCancelledEmailProps) => {
  const previewText = `Order #${orderNumber} cancelled — seller did not ship`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Order Cancelled</Heading>

          <Text style={text}>Hi {recipientName},</Text>

          {isBuyer ? (
            <>
              <Text style={text}>
                We are sorry to let you know that Order #{orderNumber} has been
                cancelled because the seller did not ship the item within the
                required timeframe.
              </Text>

              <Section style={orderBox}>
                <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
                <Hr style={hr} />
                <table style={detailsTable}>
                  <tr>
                    <td style={label}>Reason:</td>
                    <td style={value}>Seller did not ship</td>
                  </tr>
                </table>
              </Section>

              <Section style={infoBox}>
                <Text style={infoTitle}>Your refund</Text>
                <Text style={infoText}>
                  A full refund has been initiated automatically. You will
                  receive a separate confirmation email once the refund has been
                  processed, with details on when to expect your funds.
                </Text>
              </Section>

              <Text style={text}>
                We apologise for the inconvenience. The item may still be
                available from another seller — feel free to browse similar
                listings on Second Turn.
              </Text>
            </>
          ) : (
            <>
              <Text style={text}>
                Order #{orderNumber} has been automatically cancelled because
                the shipping deadline passed without the item being shipped.
              </Text>

              <Section style={orderBox}>
                <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
                <Hr style={hr} />
                <table style={detailsTable}>
                  <tr>
                    <td style={label}>Reason:</td>
                    <td style={value}>Shipping deadline exceeded</td>
                  </tr>
                </table>
              </Section>

              <Section style={warningBox}>
                <Text style={warningTitle}>What this means</Text>
                <Text style={warningText}>
                  The buyer has been refunded in full. Repeated cancellations
                  due to missed shipping deadlines may affect your seller
                  standing on Second Turn. Please ensure you can ship promptly
                  before accepting future orders.
                </Text>
              </Section>
            </>
          )}

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

export default ShippingDeadlineCancelledEmail;

const orderBox = {
  backgroundColor: '#f8fafc',
  border: '2px solid #e6ebf1',
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

const infoTitle = {
  color: '#2e3a4d',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px 0',
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

