import { Resend } from "resend";

// Only initialize if the key is present
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_EMAIL = "Saints Gaming <noreply@saintsgaming.net>"; // Change to verified domain later
const DEFAULT_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * Helper to log a warning if Resend is not configured, but still pretend to succeed.
 */
function logWarningOrSend(emailName: string, to: string, subject: string, html: string) {
  if (resend) {
    return resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    }).then(({ data, error }) => {
      if (error) {
        console.error(`[EMAIL ERROR: ${emailName}]`, error);
        return { success: false, error };
      }
      return { success: true, data };
    }).catch((error) => {
      console.error(`[EMAIL EXCEPTION: ${emailName}]`, error);
      return { success: false, error };
    });
  } else {
    console.warn(`[EMAIL: ${emailName}] RESEND_API_KEY is not set. Email was not sent.`);
    console.log(`[EMAIL CONTENT]\nTo: ${to}\nSubject: ${subject}\nHTML: ${html}`);
    return Promise.resolve({ success: true, data: { id: 'dummy-id' } });
  }
}

export async function sendWelcomeEmail(to: string, username: string) {
  const subject = "Welcome to Saints Gaming!";
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h1 style="color: #0f172a;">Welcome to Saints Gaming, ${username}!</h1>
      <p>We are thrilled to have you join our community.</p>
      <p>You can now participate in the forums, create support tickets, and join us on our game servers.</p>
      <a href="${process.env.NEXT_PUBLIC_DISCORD_INVITE || 'https://discord.gg/saintsgaming'}" style="display: inline-block; padding: 12px 24px; background-color: #5865F2; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px;">
        Join our Discord
      </a>
    </div>
  `;

  return logWarningOrSend('Welcome', to, subject, html);
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${DEFAULT_URL}/reset-password?token=${token}`;
  const subject = "Saints Gaming - Password Reset";
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h1 style="color: #0f172a;">Password Reset Request</h1>
      <p>You requested a password reset for your Saints Gaming account.</p>
      <p>Click the button below to reset your password. This link is valid for 1 hour.</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px;">
        Reset Password
      </a>
      <p style="margin-top: 20px; font-size: 12px; color: #666;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  return logWarningOrSend('Password Reset', email, subject, html);
}

export async function sendTicketReplyEmail(to: string, ticketId: string, ticketTitle: string) {
  const subject = `Update on Support Ticket #${ticketId.slice(-8).toUpperCase()}`;
  
  // Construct absolute URL for the ticket
  const ticketUrl = `${DEFAULT_URL}/support/${ticketId}`;

  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h1 style="color: #0f172a;">Ticket Update</h1>
      <p>Your support ticket "<strong>${ticketTitle}</strong>" has a new reply from our staff.</p>
      <p>Click the button below to view the response.</p>
      <a href="${ticketUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px;">
        View Ticket
      </a>
    </div>
  `;

  return logWarningOrSend('Ticket Reply', to, subject, html);
}
