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

interface OrderAcceptedBuyerEmailProps {
  buyerName: string;
  orderNumber: string;
  sellerName: string;
  shippingMethod: 't2t' | 'local_pickup';
  destinationInfo: string;
  trackingNumber?: string;
  trackingUrl?: string;
  orderUrl: string;
}

export const OrderAcceptedBuyerEmail = ({
  buyerName = 'Buyer',
  orderNumber = 'ORD-2025-001234',
  sellerName = 'Seller',
  shippingMethod = 't2t',
  destinationInfo = 'Vilnius Akropolis',
  trackingNumber,
  trackingUrl,
  orderUrl = 'https://secondturn.games/orders/123',
}: OrderAcceptedBuyerEmailProps) => {
  const previewText = `Great news! Order #${orderNumber} has been accepted`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🎉 Order Accepted!</Heading>

          <Text style={text}>Hi {buyerName},</Text>

          <Text style={text}>
            Great news! <strong>{sellerName}</strong> has accepted your order and is preparing your
            shipment.
          </Text>

          <Section style={orderBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
            <Hr style={hr} />

            {shippingMethod === 't2t' && trackingNumber && (
              <>
                <Text style={trackingLabel}>Tracking Information</Text>
                <Text style={trackingNumberStyle}>{trackingNumber}</Text>
                {trackingUrl && (
                  <div style={trackingLinkContainer}>
                    <Button style={trackingLink} href={trackingUrl}>
                      Track Package
                    </Button>
                  </div>
                )}
                <Hr style={hr} />
              </>
            )}

            <Text style={label}>
              {shippingMethod === 't2t' ? 'Pickup Location:' : 'Pickup Details:'}
            </Text>
            <Text style={value}>
              {shippingMethod === 't2t' ? '📦 ' : '🤝 '}
              {destinationInfo}
            </Text>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>What happens next?</Text>
            <Text style={infoText}>
              {shippingMethod === 't2t' ? (
                <>
                  <strong>1.</strong> The seller will drop off the package at their local terminal
                  <br />
                  <strong>2.</strong> You'll receive tracking updates via email
                  <br />
                  <strong>3.</strong> Pick up your package when it arrives (you'll get a notification)
                </>
              ) : (
                <>
                  <strong>1.</strong> The seller will contact you to arrange pickup details
                  <br />
                  <strong>2.</strong> Meet at the agreed location
                  <br />
                  <strong>3.</strong> Enjoy your new board games!
                </>
              )}
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={orderUrl}>
              View Order Details
            </Button>
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

export default OrderAcceptedBuyerEmail;

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

const orderBox = {
  backgroundColor: '#f8fafc',
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

const hr = {
  borderColor: '#e6ebf1',
  margin: '16px 0',
};

const trackingLabel = {
  color: '#6b7c93',
  fontSize: '14px',
  margin: '0 0 8px 0',
};

const trackingNumberStyle = {
  color: '#2e3a4d',
  fontSize: '20px',
  fontWeight: '600',
  fontFamily: 'monospace',
  margin: '0 0 12px 0',
};

const trackingLinkContainer = {
  margin: '12px 0',
};

const trackingLink = {
  backgroundColor: '#8fbcbb',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: '500',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 24px',
};

const label = {
  color: '#6b7c93',
  fontSize: '14px',
  margin: '0 0 4px 0',
};

const value = {
  color: '#2e3a4d',
  fontSize: '16px',
  fontWeight: '500',
  margin: '0',
};

const infoBox = {
  backgroundColor: '#e6f7ff',
  border: '1px solid #8fbcbb',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '20px',
};

const infoTitle = {
  color: '#2e3a4d',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const infoText = {
  color: '#525f7f',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
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
