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
} from '@/lib/email/styles';

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

// Template-specific styles (differ from shared)
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
