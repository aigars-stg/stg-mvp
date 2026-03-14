import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import {
  main,
  container,
  hr,
} from '@/lib/email/styles';

interface PackageDeliveredBuyerEmailProps {
  buyerName: string;
  orderNumber: string;
  sellerName: string;
  destinationTerminalName: string;
  destinationTerminalAddress: string;
  barcode: string;
  orderUrl: string;
  reviewUrl: string;
}

export const PackageDeliveredBuyerEmail = ({
  buyerName = 'John',
  orderNumber = 'ORD-2025-001234',
  sellerName = 'Anna',
  destinationTerminalName = 'Vilnius Akropolis',
  destinationTerminalAddress = 'Ozo g. 25, LT-07150 Vilnius',
  barcode = '1234567890123',
  orderUrl = 'https://secondturn.games/orders/123',
  reviewUrl = 'https://secondturn.games/orders/123/review',
}: PackageDeliveredBuyerEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your package has arrived! Order {orderNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Heading style={h1}>📦 Your Package Has Arrived!</Heading>

          <Text style={text}>Hi {buyerName},</Text>

          <Text style={text}>
            Great news! Your package from {sellerName} has been delivered to the terminal and is
            ready for pickup.
          </Text>

          {/* Delivery Info */}
          <Section style={deliveryBox}>
            <Text style={deliveryTitle}>Pickup Location</Text>
            <Text style={terminalName}>{destinationTerminalName}</Text>
            <Text style={address}>{destinationTerminalAddress}</Text>

            <Hr style={hr} />

            <Text style={deliveryTitle}>Tracking Number</Text>
            <Text style={trackingNumber}>{barcode}</Text>

            <Hr style={hr} />

            <Text style={deliveryTitle}>Order</Text>
            <Text style={orderNumberText}>{orderNumber}</Text>
          </Section>

          {/* Instructions */}
          <Section style={instructionsBox}>
            <Text style={instructionsTitle}>How to Pick Up Your Package</Text>
            <ol style={instructionsList}>
              <li style={instructionItem}>
                <strong>Bring your ID:</strong> You&apos;ll need a photo ID to collect your package
              </li>
              <li style={instructionItem}>
                <strong>Mention the tracking number:</strong> {barcode}
              </li>
              <li style={instructionItem}>
                <strong>Terminal staff will help you:</strong> Show them your tracking number and
                they&apos;ll retrieve your package
              </li>
              <li style={instructionItem}>
                <strong>Storage time:</strong> Packages are held for 5 working days. Please collect
                it soon to avoid return shipping
              </li>
            </ol>
          </Section>

          {/* CTA */}
          <Section style={buttonContainer}>
            <Button style={button} href={orderUrl}>
              View Order Details
            </Button>
          </Section>

          {/* Footer Note */}
          <Text style={footerText}>
            Once you&apos;ve picked up and inspected your package, you can mark the order as complete in
            your order history.
          </Text>

          {/* Review Prompt */}
          <Section style={reviewBox}>
            <Text style={reviewTitle}>⭐ How was your experience?</Text>
            <Text style={reviewText}>
              Once you&apos;ve received your games, we&apos;d love to hear about your experience with{' '}
              {sellerName}. Your review helps build trust in our community!
            </Text>
            <Button style={reviewButton} href={reviewUrl}>
              Leave a Review
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            SecondTurn - Board Game Marketplace
            <br />
            Questions? Reply to this email or contact support
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PackageDeliveredBuyerEmail;

// Template-specific styles
const h1 = {
  color: '#2e3a4d',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
  padding: '0 40px',
};

const deliveryBox = {
  backgroundColor: '#e8f4f8',
  border: '2px solid #5e8ba3',
  borderRadius: '12px',
  margin: '24px 40px',
  padding: '24px',
};

const deliveryTitle = {
  color: '#2e3a4d',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px',
};

const terminalName = {
  color: '#2e3a4d',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 4px',
};

const address = {
  color: '#697386',
  fontSize: '14px',
  margin: '0',
};

const trackingNumber = {
  fontFamily: 'monospace',
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#5e8ba3',
  margin: '0',
};

const orderNumberText = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#2e3a4d',
  margin: '0',
};

const instructionsBox = {
  backgroundColor: '#fef8e7',
  border: '1px solid #f9d67a',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '20px 24px',
};

const instructionsTitle = {
  color: '#2e3a4d',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const instructionsList = {
  color: '#525f7f',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
  paddingLeft: '20px',
};

const instructionItem = {
  margin: '0 0 8px',
};

const buttonContainer = {
  padding: '24px 40px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#5e8ba3',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 20px',
};

const footerText = {
  color: '#697386',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0',
  padding: '0 40px',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const reviewBox = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: '12px',
  margin: '24px 40px',
  padding: '24px',
  textAlign: 'center' as const,
};

const reviewTitle = {
  color: '#166534',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const reviewText = {
  color: '#525f7f',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 16px',
};

const reviewButton = {
  backgroundColor: '#22c55e',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};
