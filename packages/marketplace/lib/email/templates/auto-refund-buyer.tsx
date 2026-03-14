import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
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
  infoBox,
  infoText,
  button,
} from '@/lib/email/styles';

interface AutoRefundBuyerEmailProps {
  buyerName: string;
  refundAmountEuros: string;
  retryUrl: string;
}

export const AutoRefundBuyerEmail = ({
  buyerName = 'there',
  refundAmountEuros = '0.00',
  retryUrl = 'https://secondturn.games/browse',
}: AutoRefundBuyerEmailProps) => {
  const previewText = `Your payment of \u20AC${refundAmountEuros} was automatically refunded`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Payment Refunded</Heading>

          <Text style={text}>Hi {buyerName},</Text>

          <Text style={text}>
            Your payment of &euro;{refundAmountEuros} was successfully processed,
            but we encountered a technical issue while creating your order. To
            make sure you are not charged incorrectly, we have automatically
            refunded the full amount.
          </Text>

          <Section style={infoBox}>
            <Text style={infoTitle}>What happened</Text>
            <Text style={infoText}>
              A temporary processing error prevented us from completing your
              order. Your payment has been reversed and you have not been
              charged. The items you selected should still be available.
            </Text>
          </Section>

          <Text style={text}>
            We apologise for the inconvenience. Please try placing your order
            again — it should work on the next attempt.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={retryUrl}>
              Try Again
            </Button>
          </Section>

          <Text style={text}>
            If you continue to experience issues, reply to this email and our
            team will help you.
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

export default AutoRefundBuyerEmail;

const infoTitle = {
  color: '#2e3a4d',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const buttonContainer = {
  margin: '32px 40px',
  textAlign: 'center' as const,
};
