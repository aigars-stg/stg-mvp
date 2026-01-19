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

interface ShippingLabelSellerEmailProps {
  sellerName: string;
  orderNumber: string;
  buyerName: string;
  destinationTerminalName: string;
  destinationTerminalAddress: string;
  parcelId: string;
  barcode?: string;
  trackingUrl?: string;
  orderUrl: string;
}

export const ShippingLabelSellerEmail = ({
  sellerName = 'Seller',
  orderNumber = 'ORD-2025-001234',
  buyerName = 'Buyer',
  destinationTerminalName = 'Vilnius Akropolis',
  destinationTerminalAddress = 'Ozo g. 25, LT-07150 Vilnius',
  parcelId = '4703389',
  barcode,
  trackingUrl = 'https://tracking.example.com',
  orderUrl = 'https://secondturn.games/seller/orders/123',
}: ShippingLabelSellerEmailProps) => {
  const previewText = `Ready to ship - Order #${orderNumber}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>📦 Ready to Ship!</Heading>

          <Text style={text}>Hi {sellerName},</Text>

          <Text style={text}>
            Your parcel has been registered with Unisend. Visit any Unisend terminal to print your
            label and ship the package.
          </Text>

          <Section style={orderBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
            <Hr style={hr} />

            <table style={detailsTable}>
              <tr>
                <td style={label}>Buyer:</td>
                <td style={value}>{buyerName}</td>
              </tr>
              <tr>
                <td style={label}>Destination:</td>
                <td style={value}>
                  {destinationTerminalName}
                  <br />
                  <span style={addressText}>{destinationTerminalAddress}</span>
                </td>
              </tr>
            </table>

            <Hr style={hr} />

            <Text style={parcelIdLabel}>Your Parcel ID</Text>
            <Text style={parcelIdStyle}>{parcelId}</Text>
          </Section>

          <Section style={instructionsBox}>
            <Text style={instructionsTitle}>📋 How to Ship</Text>
            <div style={instructionsList}>
              <Text style={instructionItem}>
                <strong>1.</strong> Go to your nearest <strong>Unisend terminal</strong>
              </Text>
              <Text style={instructionItem}>
                <strong>2.</strong> Enter the <strong>Parcel ID</strong> shown above at the terminal screen
              </Text>
              <Text style={instructionItem}>
                <strong>3.</strong> Print the label at the terminal and attach it to your parcel
              </Text>
              <Text style={instructionItem}>
                <strong>4.</strong> Place the parcel in the locker opened by the terminal
              </Text>
            </div>
          </Section>

          {trackingUrl && (
            <Section style={buttonContainer}>
              <Button style={button} href={trackingUrl}>
                Track Package
              </Button>
            </Section>
          )}

          <Section style={buttonContainer}>
            <Button style={secondaryButton} href={orderUrl}>
              View Order Details
            </Button>
          </Section>

          <Section style={warningBox}>
            <Text style={warningText}>
              ⚠️ <strong>Important:</strong> Please drop off your package within 3 days to ensure
              timely delivery.
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

export default ShippingLabelSellerEmail;

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
  border: '2px solid #8fbcbb',
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

const detailsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
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
  fontWeight: '500',
  paddingBottom: '12px',
};

const addressText = {
  fontSize: '14px',
  color: '#6b7c93',
};

const trackingNumber = {
  color: '#2e3a4d',
  fontSize: '18px',
  fontWeight: '600',
  fontFamily: 'monospace',
  paddingBottom: '12px',
};

const parcelIdLabel = {
  color: '#6b7c93',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px 0',
};

const parcelIdStyle = {
  color: '#8fbcbb',
  fontSize: '32px',
  fontWeight: '700',
  fontFamily: 'monospace',
  margin: '0',
  padding: '8px 0',
};

const instructionsBox = {
  backgroundColor: '#e6f7ff',
  border: '1px solid #8fbcbb',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '20px',
};

const instructionsTitle = {
  color: '#2e3a4d',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const instructionsList = {
  margin: '0',
};

const instructionItem = {
  color: '#525f7f',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '8px 0',
};

const buttonContainer = {
  margin: '24px 40px',
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

const secondaryButton = {
  backgroundColor: '#ffffff',
  border: '2px solid #8fbcbb',
  borderRadius: '8px',
  color: '#8fbcbb',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
};

const warningBox = {
  backgroundColor: '#fff9e6',
  border: '1px solid #ffd966',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '16px',
};

const warningText = {
  color: '#6b5e00',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '32px 40px 0',
  textAlign: 'center' as const,
};
