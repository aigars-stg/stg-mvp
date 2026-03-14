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
  orderBoxGreen,
  orderNumberStyle,
  hr,
  infoBox,
  infoTitle,
  infoText,
  buttonContainer,
  button,
  footer,
} from '@/lib/email/styles';

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

          <Section style={orderBoxGreen}>
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
                  <strong>2.</strong> You&apos;ll receive tracking updates via email
                  <br />
                  <strong>3.</strong> Pick up your package when it arrives (you&apos;ll get a notification)
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

// Template-specific styles
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
  backgroundColor: '#88C0D0',
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

