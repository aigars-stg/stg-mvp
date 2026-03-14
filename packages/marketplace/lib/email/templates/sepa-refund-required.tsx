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
  Link,
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
} from '@/lib/email/styles';

interface SepaRefundRequiredEmailProps {
  orderNumber: string;
  orderId: string;
  refundAmountEuros: string;
  buyerName: string;
}

export const SepaRefundRequiredEmail = ({
  orderNumber = 'ORD-2025-001234',
  orderId = '00000000-0000-0000-0000-000000000000',
  refundAmountEuros = '24.99',
  buyerName = 'Buyer',
}: SepaRefundRequiredEmailProps) => {
  const previewText = `Manual SEPA refund required for Order #${orderNumber}`;
  const adminUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>SEPA Refund Required</Heading>

          <Text style={text}>
            A bank link refund requires a manual SEPA transfer.
          </Text>

          <Section style={alertBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
            <Hr style={hr} />
            <table style={detailsTable}>
              <tr>
                <td style={label}>Refund amount:</td>
                <td style={amountValue}>&euro;{refundAmountEuros}</td>
              </tr>
              <tr>
                <td style={label}>Buyer:</td>
                <td style={value}>{buyerName}</td>
              </tr>
            </table>
          </Section>

          <Text style={text}>
            The buyer paid via bank link, so EveryPay cannot process an
            automatic refund. Please initiate a manual SEPA bank transfer for
            the amount above.
          </Text>

          <Text style={text}>
            After completing the transfer, confirm the refund in the{' '}
            <Link href={`${adminUrl}/admin/orders/${orderId}`}>
              admin dashboard
            </Link>{' '}
            by entering the SEPA reference number.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Second Turn - Internal Staff Notification
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default SepaRefundRequiredEmail;

const alertBox = {
  backgroundColor: '#fff3e0',
  border: '2px solid #e8a838',
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
  color: '#e8a838',
  fontSize: '20px',
  fontWeight: '700',
  paddingBottom: '12px',
};

