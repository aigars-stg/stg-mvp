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
  infoBox,
  infoTitle,
  infoText,
  buttonContainer,
  button,
  footer,
} from '@/lib/email/styles';

interface OrderCompletedSellerEmailProps {
  sellerName: string;
  orderNumber: string;
  orderUrl: string;
  walletUrl: string;
}

export const OrderCompletedSellerEmail = ({
  sellerName = 'Seller',
  orderNumber = 'ORD-2025-001234',
  orderUrl = 'https://secondturn.games/orders/123',
  walletUrl = 'https://secondturn.games/wallet',
}: OrderCompletedSellerEmailProps) => {
  const previewText = `Order #${orderNumber} complete - earnings credited to your wallet`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Sale Complete</Heading>

          <Text style={text}>Hi {sellerName},</Text>

          <Text style={text}>
            Order #{orderNumber} has been finalized and your earnings have been credited to your wallet.
          </Text>

          <Section style={orderBox}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>Your earnings are ready</Text>
            <Text style={infoText}>
              The sale amount (minus commission) has been added to your wallet balance.
              You can request a withdrawal at any time from your wallet page.
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={walletUrl}>
              View Your Wallet
            </Button>
          </Section>

          <Text style={{ ...text, fontSize: '14px', color: '#666' }}>
            Or <a href={orderUrl} style={{ color: '#88C0D0' }}>view order details</a>
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

export default OrderCompletedSellerEmail;
