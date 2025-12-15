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

interface AccountDeletedEmailProps {
    userName: string;
    recoveryDate: string; // Formatted date string
    supportUrl: string;
}

export const AccountDeletedEmail = ({
    userName = 'User',
    recoveryDate = 'December 31, 2025',
    supportUrl = 'https://secondturn.games/support',
}: AccountDeletedEmailProps) => {
    const previewText = `Your account has been deleted - Recovery available until ${recoveryDate}`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>Account Deletion Requested</Heading>

                    <Text style={text}>Hi {userName},</Text>

                    <Text style={text}>
                        We've received your request to delete your Second Turn account. Your account has been deactivated and your profile is hidden from the public.
                    </Text>

                    <Section style={warningBox}>
                        <Heading as="h3" style={warningTitle}>⚠️ Important: 14-Day Recovery Period</Heading>
                        <Text style={warningText}>
                            You can recover your account until <strong>{recoveryDate}</strong>.
                        </Text>
                        <Text style={warningText}>
                            To cancel the deletion and restore your account, simply log in to Second Turn before this date. After {recoveryDate}, your account and all associated data will be <strong>permanently deleted</strong> and cannot be recovered.
                        </Text>
                    </Section>

                    <Section style={infoBox}>
                        <Text style={infoTitle}>📋 Data Retention Policy</Text>
                        <Text style={infoText}>
                            For legal compliance and dispute resolution purposes, we retain transaction records and limited data for 90 days. After this period, all your data will be completely erased from our servers in accordance with GDPR requirements.
                        </Text>
                    </Section>

                    <Hr style={hr} />

                    <Text style={text}>
                        We're sorry to see you go. If you didn't request this deletion, please contact our support team immediately.
                    </Text>

                    <Section style={buttonContainer}>
                        <Button style={button} href={supportUrl}>
                            Contact Support
                        </Button>
                    </Section>

                    <Hr style={hr} />

                    <Text style={footer}>
                        Second Turn - Board Game Marketplace
                        <br />
                        This is an automated message regarding your account status.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default AccountDeletedEmail;

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
    color: '#bf616a', // Aurora Red for deletion/warning
    fontSize: '32px',
    fontWeight: '700',
    margin: '40px 0',
    padding: '0 40px',
    textAlign: 'center' as const,
};

const text = {
    color: '#4c566a', // Polar Night
    fontSize: '16px',
    lineHeight: '24px',
    margin: '16px 40px',
};

const warningBox = {
    backgroundColor: '#bf616a1a', // Aurora Red with low opacity
    border: '2px solid #bf616a',
    borderRadius: '12px',
    margin: '24px 40px',
    padding: '24px',
};

const warningTitle = {
    color: '#bf616a',
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 12px 0',
};

const warningText = {
    color: '#2e3440',
    fontSize: '15px',
    lineHeight: '22px',
    margin: '8px 0',
};

const infoBox = {
    backgroundColor: '#eceff4', // Snow Storm
    border: '1px solid #d8dee9',
    borderRadius: '8px',
    margin: '24px 40px',
    padding: '20px',
};

const infoTitle = {
    color: '#4c566a',
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 12px 0',
};

const infoText = {
    color: '#4c566a',
    fontSize: '14px',
    lineHeight: '22px',
    margin: '0',
};

const hr = {
    borderColor: '#e5e9f0',
    margin: '24px 0',
};

const buttonContainer = {
    margin: '32px 40px',
    textAlign: 'center' as const,
};

const button = {
    backgroundColor: '#4c566a', // Polar Night
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
