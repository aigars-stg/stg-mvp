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
  orderBoxOrange,
  warningBox,
} from '@/lib/email/styles';

interface DisputeSellerDeadlinePassedEmailProps {
  sellerName: string;
  orderNumber: string;
}

export const DisputeSellerDeadlinePassedEmail = ({
  sellerName = 'Seller',
  orderNumber = 'ORD-2025-001234',
}: DisputeSellerDeadlinePassedEmailProps) => {
  const previewText = `Response deadline passed for Order #${orderNumber}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Response Deadline Passed</Heading>

          <Text style={text}>Hi {sellerName},</Text>

          <Text style={text}>
            The 48-hour response window for the dispute on Order #{orderNumber}{' '}
            has expired without a response from you.
          </Text>

          <Section style={orderBoxOrange}>
            <Text style={orderNumberStyle}>Order #{orderNumber}</Text>
          </Section>

          <Section style={warningBox}>
            <Text style={warningTitle}>What this means</Text>
            <Text style={warningText}>
              The dispute will now proceed to review by our team without your
              input. Our team will make a decision based on the information
              available, which may include the buyer&apos;s evidence and order
              history.
            </Text>
          </Section>

          <Text style={text}>
            If you believe there are extenuating circumstances, you may contact
            support@secondturn.games — however, we cannot guarantee your input
            will be considered at this stage.
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

export default DisputeSellerDeadlinePassedEmail;

// Template-specific styles (differ from shared)
const orderNumberStyle = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#2e3a4d',
  margin: '0',
};

const warningTitle = {
  color: '#2e3a4d',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const warningText = {
  color: '#525f7f',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};
