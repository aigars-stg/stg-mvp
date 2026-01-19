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

interface NewMessageEmailProps {
  recipientName: string;
  senderName: string;
  orderNumber: string;
  messagePreview: string;
  hasPhotos: boolean;
  transactionUrl: string;
}

export const NewMessageEmail = ({
  recipientName = 'User',
  senderName = 'Seller',
  orderNumber = 'ORD-2025-001234',
  messagePreview = 'Hi! I have a question about the order...',
  hasPhotos = false,
  transactionUrl = 'https://secondturn.games/orders/123',
}: NewMessageEmailProps) => {
  const previewText = `New message from ${senderName} about order #${orderNumber}`;

  // Truncate message preview if too long
  const truncatedPreview =
    messagePreview.length > 200
      ? messagePreview.substring(0, 200) + '...'
      : messagePreview;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>💬 New Message</Heading>

          <Text style={text}>Hi {recipientName},</Text>

          <Text style={text}>
            You have a new message from <strong>{senderName}</strong> about your order.
          </Text>

          <Section style={messageBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
            <Hr style={hr} />
            <Text style={senderLabel}>From {senderName}:</Text>
            <Text style={messagePreviewStyle}>"{truncatedPreview}"</Text>
            {hasPhotos && (
              <Text style={photoIndicator}>📷 Includes photos</Text>
            )}
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={transactionUrl}>
              View Conversation
            </Button>
          </Section>

          <Section style={infoBox}>
            <Text style={infoText}>
              Reply directly from the order page to continue the conversation.
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Second Turn - Board Game Marketplace
            <br />
            <span style={footerMuted}>
              You're receiving this because someone sent you a message about an order.
            </span>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default NewMessageEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
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

const messageBox = {
  backgroundColor: '#f8fafc',
  border: '2px solid #8fbcbb',
  borderRadius: '12px',
  margin: '24px 40px',
  padding: '24px',
};

const orderNumberStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#6b7c93',
  margin: '0 0 12px 0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '16px 0',
};

const senderLabel = {
  color: '#6b7c93',
  fontSize: '14px',
  margin: '0 0 8px 0',
};

const messagePreviewStyle = {
  color: '#2e3a4d',
  fontSize: '16px',
  lineHeight: '24px',
  fontStyle: 'italic',
  margin: '0',
  padding: '12px 16px',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  borderLeft: '3px solid #8fbcbb',
};

const photoIndicator = {
  color: '#6b7c93',
  fontSize: '14px',
  margin: '12px 0 0 0',
};

const infoBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e6ebf1',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '16px',
};

const infoText = {
  color: '#6b7c93',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  textAlign: 'center' as const,
};

const buttonContainer = {
  margin: '32px 40px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#8fbcbb',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '32px 40px 0',
  textAlign: 'center' as const,
};

const footerMuted = {
  color: '#b0b8c4',
  fontSize: '11px',
};
