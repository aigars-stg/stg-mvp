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
  warningBox,
  infoBox,
  infoText,
} from '@/lib/email/styles';

interface WithdrawalRejectedEmailProps {
  sellerName: string;
  amountEuros: string;
  rejectionReason: string;
}

export const WithdrawalRejectedEmail = ({
  sellerName = 'Seller',
  amountEuros = '50.00',
  rejectionReason = 'Invalid bank details',
}: WithdrawalRejectedEmailProps) => {
  const previewText = `Your withdrawal of \u20AC${amountEuros} could not be processed`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Withdrawal Not Processed</Heading>

          <Text style={text}>Hi {sellerName},</Text>

          <Text style={text}>
            Unfortunately, your withdrawal request could not be processed. The
            funds have been returned to your Second Turn wallet.
          </Text>

          <Section style={warningBox}>
            <Text style={orderNumberStyle}>Withdrawal Details</Text>
            <Hr style={hr} />
            <table style={detailsTable}>
              <tr>
                <td style={label}>Amount:</td>
                <td style={amountValue}>&euro;{amountEuros}</td>
              </tr>
              <tr>
                <td style={label}>Reason:</td>
                <td style={value}>{rejectionReason}</td>
              </tr>
            </table>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>What to do next</Text>
            <Text style={infoText}>
              Your funds are available in your wallet. You can submit a new
              withdrawal request with corrected details. If you believe this was
              an error, reply to this email and our team will help.
            </Text>
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

export default WithdrawalRejectedEmail;

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
  color: '#d08770',
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
