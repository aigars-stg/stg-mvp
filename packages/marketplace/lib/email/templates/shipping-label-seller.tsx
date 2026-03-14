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
  orderBox,
  orderNumberStyle,
  hr,
  detailsTable,
  button,
  footer,
  infoBox as instructionsBox,
  infoTitle as instructionsTitle,
} from '@/lib/email/styles';

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
  barcode: _barcode,
  trackingUrl = 'https://tracking.example.com',
  orderUrl = 'https://secondturn.games/orders/123',
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

// Template-specific styles
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

const parcelIdLabel = {
  color: '#6b7c93',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px 0',
};

const parcelIdStyle = {
  color: '#88C0D0',
  fontSize: '32px',
  fontWeight: '700',
  fontFamily: 'monospace',
  margin: '0',
  padding: '8px 0',
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

const secondaryButton = {
  backgroundColor: '#ffffff',
  border: '2px solid #88C0D0',
  borderRadius: '8px',
  color: '#88C0D0',
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

