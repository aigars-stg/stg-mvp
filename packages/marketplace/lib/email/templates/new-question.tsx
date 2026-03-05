import { Html, Head, Body, Container, Section, Text, Button, Hr } from '@react-email/components';

interface NewQuestionEmailProps {
  recipientName: string;
  gameName: string;
  questionContent: string;
  authorName: string;
  listingUrl: string;
  isReply?: boolean;
}

export function NewQuestionEmail({
  recipientName,
  gameName,
  questionContent,
  authorName,
  listingUrl,
  isReply = false,
}: NewQuestionEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '20px' }}>
          <Section style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '32px' }}>
            <Text style={{ fontSize: '16px', color: '#111827' }}>
              Hi {recipientName},
            </Text>
            <Text style={{ fontSize: '16px', color: '#111827' }}>
              {isReply
                ? `${authorName} replied to a question on "${gameName}":`
                : `${authorName} asked a question about "${gameName}":`}
            </Text>
            <Section style={{ backgroundColor: '#f3f4f6', borderRadius: '6px', padding: '16px', margin: '16px 0' }}>
              <Text style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
                &ldquo;{questionContent}&rdquo;
              </Text>
            </Section>
            <Button
              href={listingUrl}
              style={{
                backgroundColor: '#111827',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              View & Reply
            </Button>
          </Section>
          <Hr style={{ margin: '24px 0' }} />
          <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const }}>
            Second Turn Games — Every game deserves a second turn
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
