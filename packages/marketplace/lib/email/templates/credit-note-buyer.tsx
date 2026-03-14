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
  label,
  value,
  infoBox,
  infoText,
} from '@/lib/email/styles';

interface CreditNoteBuyerEmailProps {
  buyerName: string;
  orderNumber: string;
  creditNoteNumber: string;
  refundAmount: string;
  refundDate: string;
}

export const CreditNoteBuyerEmail = ({
  buyerName = 'Buyer',
  orderNumber = 'ORD-2026-001234',
  creditNoteNumber = 'CN-2026-0001',
  refundAmount = '24.99',
  refundDate = '14.03.2026',
}: CreditNoteBuyerEmailProps) => {
  const previewText = `Credit note ${creditNoteNumber} for your refund on Order #${orderNumber}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Credit Note</Heading>

          <Text style={text}>Hi {buyerName},</Text>

          <Text style={text}>
            A credit note has been issued for your refunded order. Please keep
            this for your records.
          </Text>

          <Section style={creditNoteBox}>
            <Text style={orderNumberStyle}>Credit Note {creditNoteNumber}</Text>
            <Hr style={hr} />
            <table style={detailsTable}>
              <tbody>
                <tr>
                  <td style={label}>Order:</td>
                  <td style={value}>#{orderNumber}</td>
                </tr>
                <tr>
                  <td style={label}>Credit amount:</td>
                  <td style={amountValue}>&euro;{refundAmount}</td>
                </tr>
                <tr>
                  <td style={label}>Date issued:</td>
                  <td style={value}>{refundDate}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>What is a credit note?</Text>
            <Text style={infoText}>
              A credit note is a VAT document confirming that a refund has been
              processed for your order. You may need this document for accounting
              or tax purposes.
            </Text>
          </Section>

          <Text style={text}>
            If you have any questions about this credit note, reply to this email
            and our team will be happy to help.
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

export default CreditNoteBuyerEmail;

const creditNoteBox = {
  backgroundColor: '#f8fafc',
  border: '2px solid #88C0D0',
  borderRadius: '12px',
  margin: '24px 40px',
  padding: '24px',
};

const amountValue = {
  color: '#a3be8c',
  fontSize: '20px',
  fontWeight: '700',
  paddingBottom: '8px',
};

const infoTitle = {
  color: '#2e3a4d',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};
