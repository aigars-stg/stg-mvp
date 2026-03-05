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
  border: '2px solid #e6ebf1',
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

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '32px 40px 0',
  textAlign: 'center' as const,
};
