import { Body } from '@react-email/body';
import { Button } from '@react-email/button';
import { Container } from '@react-email/container';
import { Head } from '@react-email/head';
import { Heading } from '@react-email/heading';
import { Html } from '@react-email/html';
import { Preview } from '@react-email/preview';
import { Section } from '@react-email/section';
import { Text } from '@react-email/text';
import { Hr } from '@react-email/hr';
import * as React from 'react';

interface LoginAlertEmailProps {
  userName: string;
  loginTime: string;       // Formatted time string
  device: string;          // e.g., "Chrome on Windows"
  location: string;        // e.g., "Riga, Latvia"
  ipAddress: string;
  isUnusual: boolean;      // Whether this login was flagged as unusual
  securityUrl: string;     // Link to account security settings
}

export const LoginAlertEmail = ({
  userName = 'User',
  loginTime = 'January 11, 2026 at 10:30 AM',
  device = 'Chrome on Windows',
  location = 'Unknown location',
  ipAddress = '0.0.0.0',
  isUnusual = false,
  securityUrl = 'https://secondturn.games/account/security',
}: LoginAlertEmailProps) => {
  const previewText = isUnusual
    ? `Unusual login detected on your Second Turn account`
    : `New login to your Second Turn account from ${device}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={isUnusual ? h1Warning : h1}>
            {isUnusual ? 'Unusual Login Detected' : 'New Login to Your Account'}
          </Heading>

          <Text style={text}>Hi {userName},</Text>

          {isUnusual ? (
            <Text style={text}>
              We detected a login to your Second Turn account from a new location or device.
              If this wasn't you, please secure your account immediately.
            </Text>
          ) : (
            <Text style={text}>
              A new login was detected on your account. If this was you, no action is needed.
            </Text>
          )}

          <Section style={isUnusual ? detailsBoxWarning : detailsBox}>
            <Text style={detailsTitle}>Login Details</Text>
            <table style={detailsTable}>
              <tbody>
                <tr>
                  <td style={detailsLabel}>Time:</td>
                  <td style={detailsValue}>{loginTime}</td>
                </tr>
                <tr>
                  <td style={detailsLabel}>Device:</td>
                  <td style={detailsValue}>{device}</td>
                </tr>
                <tr>
                  <td style={detailsLabel}>Location:</td>
                  <td style={detailsValue}>{location}</td>
                </tr>
                <tr>
                  <td style={detailsLabel}>IP Address:</td>
                  <td style={detailsValue}>{ipAddress}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {isUnusual && (
            <Section style={warningBox}>
              <Text style={warningText}>
                <strong>If this wasn't you:</strong> Someone may have access to your email account.
                We recommend securing your email and checking for any unauthorized activity on your account.
              </Text>
            </Section>
          )}

          <Section style={buttonContainer}>
            <Button style={isUnusual ? buttonWarning : button} href={securityUrl}>
              Review Account Security
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footerText}>
            You're receiving this email because you have login alerts enabled for your Second Turn account.
            You can manage your security preferences in your account settings.
          </Text>

          <Text style={footer}>
            Second Turn - Board Game Marketplace
            <br />
            This is an automated security notification.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default LoginAlertEmail;

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
  wordWrap: 'break-word' as const,
};

const h1 = {
  color: '#5e81ac', // Frost Blue for normal
  fontSize: '28px',
  fontWeight: '700',
  margin: '40px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const h1Warning = {
  color: '#d08770', // Aurora Orange for warning
  fontSize: '28px',
  fontWeight: '700',
  margin: '40px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const text = {
  color: '#4c566a',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 40px',
};

const detailsBox = {
  backgroundColor: '#eceff4',
  border: '1px solid #d8dee9',
  borderRadius: '12px',
  margin: '24px 40px',
  padding: '20px 24px',
};

const detailsBoxWarning = {
  backgroundColor: '#d087701a',
  border: '2px solid #d08770',
  borderRadius: '12px',
  margin: '24px 40px',
  padding: '20px 24px',
};

const detailsTitle = {
  color: '#2e3440',
  fontSize: '16px',
  fontWeight: '700',
  margin: '0 0 16px 0',
};

const detailsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const detailsLabel = {
  color: '#4c566a',
  fontSize: '14px',
  fontWeight: '600',
  padding: '6px 0',
  width: '100px',
  verticalAlign: 'top' as const,
};

const detailsValue = {
  color: '#2e3440',
  fontSize: '14px',
  padding: '6px 0',
  verticalAlign: 'top' as const,
};

const warningBox = {
  backgroundColor: '#bf616a1a',
  border: '1px solid #bf616a',
  borderRadius: '8px',
  margin: '24px 40px',
  padding: '16px 20px',
};

const warningText = {
  color: '#2e3440',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const buttonContainer = {
  margin: '32px 40px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#5e81ac',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
};

const buttonWarning = {
  backgroundColor: '#d08770',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
};

const hr = {
  borderColor: '#e5e9f0',
  margin: '24px 0',
};

const footerText = {
  color: '#8898aa',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '24px 40px 16px',
  textAlign: 'center' as const,
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '0 40px',
  textAlign: 'center' as const,
};
