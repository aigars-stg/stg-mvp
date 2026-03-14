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

interface WithdrawalCompletedEmailProps {
  sellerName: string;
  amountEuros: string;
  maskedIban: string;
  bankReference: string;
  processedDate: string;
}

export const WithdrawalCompletedEmail = ({
  sellerName = 'Seller',
  amountEuros = '50.00',
  maskedIban = '****1234',
  bankReference = 'REF-001',
  processedDate = '14.03.2026',
}: WithdrawalCompletedEmailProps) => {
  const previewText = `Your withdrawal of \u20AC${amountEuros} has been processed`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Withdrawal Complete</Heading>

          <Text style={text}>Hi {sellerName},</Text>

          <Text style={text}>
            Your withdrawal has been processed and the funds are on their way
            to your bank account.
          </Text>

          <Section style={successBox}>
            <Text style={orderNumberStyle}>Withdrawal Details</Text>
            <Hr style={hr} />
            <table style={detailsTable}>
              <tr>
                <td style={label}>Amount:</td>
                <td style={amountValue}>&euro;{amountEuros}</td>
              </tr>
              <tr>
                <td style={label}>Bank account:</td>
                <td style={value}>{maskedIban}</td>
              </tr>
              <tr>
                <td style={label}>Bank reference:</td>
                <td style={value}>{bankReference}</td>
              </tr>
              <tr>
                <td style={label}>Processed on:</td>
                <td style={value}>{processedDate}</td>
              </tr>
            </table>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>When to expect your funds</Text>
            <Text style={infoText}>
              SEPA transfers typically arrive within 1-2 business days. If you
              do not see the funds after 3 business days, please reply to this
              email.
            </Text>
          </Section>

          <Text style={text}>
            Thank you for selling on Second Turn. Happy gaming.
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

export default WithdrawalCompletedEmail;

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
  width: '140px',
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
