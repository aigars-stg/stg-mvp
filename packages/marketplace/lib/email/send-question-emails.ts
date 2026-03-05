import { sendEmail } from './resend';
import { NewQuestionEmail } from './templates/new-question';
import { loggers } from '../logger';

export async function sendNewQuestionEmail(params: {
  sellerName: string;
  sellerEmail: string;
  gameName: string;
  questionContent: string;
  authorName: string;
  listingUrl: string;
}) {
  try {
    await sendEmail({
      to: params.sellerEmail,
      subject: `New question about "${params.gameName}"`,
      react: NewQuestionEmail({
        recipientName: params.sellerName,
        gameName: params.gameName,
        questionContent: params.questionContent,
        authorName: params.authorName,
        listingUrl: params.listingUrl,
      }),
    });
    loggers.email.info({ listingUrl: params.listingUrl }, 'Question notification sent');
    return { success: true };
  } catch (error) {
    loggers.email.error({ error }, 'Failed to send question notification');
    return { success: false };
  }
}

export async function sendNewReplyEmail(params: {
  recipientName: string;
  recipientEmail: string;
  gameName: string;
  replyContent: string;
  authorName: string;
  listingUrl: string;
}) {
  try {
    await sendEmail({
      to: params.recipientEmail,
      subject: `New reply on "${params.gameName}"`,
      react: NewQuestionEmail({
        recipientName: params.recipientName,
        gameName: params.gameName,
        questionContent: params.replyContent,
        authorName: params.authorName,
        listingUrl: params.listingUrl,
        isReply: true,
      }),
    });
    loggers.email.info({ listingUrl: params.listingUrl }, 'Reply notification sent');
    return { success: true };
  } catch (error) {
    loggers.email.error({ error }, 'Failed to send reply notification');
    return { success: false };
  }
}
