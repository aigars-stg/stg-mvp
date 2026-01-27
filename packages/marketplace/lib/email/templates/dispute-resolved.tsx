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

interface DisputeResolvedEmailProps {
  recipientName: string;
  orderNumber: string;
  resolution: string;
  resolutionNote: string;
  isSellerFavor: boolean;
}

const RESOLUTION_LABELS: Record<string, string> = {
  buyer_full_refund: 'Full refund to buyer',
  buyer_partial_refund: 'Partial refund to buyer',
  seller_favor: 'Resolved in seller\'s favour',
  mutual_agreement: 'Mutual agreement',
};

export const DisputeResolvedEmail = ({
  recipientName = 'User',
  orderNumber = 'ORD-2025-001234',
  resolution = 'buyer_full_refund',
  resolutionNote = 'After reviewing the evidence...',
  isSellerFavor = false,
}: DisputeResolvedEmailProps) => {
  const previewText = `Dispute resolved for Order #${orderNumber}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Dispute Resolved</Heading>

          <Text style={text}>Hi {recipientName},</Text>

          <Text style={text}>
            The dispute for Order #{orderNumber} has been reviewed and resolved
            by our team.
          </Text>

          <Section style={isSellerFavor ? successBox : orderBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
            <Hr style={hr} />
            <table style={detailsTable}>
              <tr>
                <td style={label}>Outcome:</td>
                <td style={value}>
                  {RESOLUTION_LABELS[resolution] || resolution}
                </td>
              </tr>
            </table>
          </Section>

          {resolutionNote && (
            <Section style={noteBox}>
              <Text style={noteTitle}>Our team&apos;s notes</Text>
              <Text style={noteText}>{resolutionNote}</Text>
            </Section>
          )}

          <Text style={text}>
            If you believe this decision was made in error, you may contact
            support@secondturn.games within 7 days to request a review.
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

export default DisputeResolvedEmail;

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

const successBox = {
  backgroundColor: '#e6ffe6',
  border: '2px solid #a3be8c',
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
  fontWeight: '600',
  paddingBottom: '12px',
};

const noteBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e6ebf1',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '20px',
};

const noteTitle = {
  color: '#2e3a4d',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const noteText = {
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
