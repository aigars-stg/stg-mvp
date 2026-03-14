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
  buttonContainer,
  button,
  footer,
} from '@/lib/email/styles';

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
            <Text style={messagePreviewStyle}>&ldquo;{truncatedPreview}&rdquo;</Text>
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
              You&apos;re receiving this because someone sent you a message about an order.
            </span>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default NewMessageEmail;

// Template-specific styles
const messageBox = {
  backgroundColor: '#f8fafc',
  border: '2px solid #88C0D0',
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
  borderLeft: '3px solid #88C0D0',
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

const footerMuted = {
  color: '#b0b8c4',
  fontSize: '11px',
};
