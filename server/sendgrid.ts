import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (!SENDGRID_API_KEY) {
  console.warn("[SendGrid] API key not configured. Email sending will be disabled.");
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

/**
 * Send email using SendGrid
 * Returns true on success, false on failure
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    if (!SENDGRID_API_KEY) {
      console.warn("[SendGrid] API key not configured. Email not sent.");
      return false;
    }

    const msg = {
      to: options.to,
      from: options.from || "kaique.studiolaser@gmail.com",
      replyTo: options.replyTo || "kaique.studiolaser@gmail.com",
      subject: options.subject,
      html: options.html,
    };

    await sgMail.send(msg);
    console.log(`[SendGrid] Email sent successfully to ${Array.isArray(options.to) ? options.to.join(", ") : options.to}`);
    return true;
  } catch (error: any) {
    console.error("[SendGrid] Error sending email:", error?.message || error);
    if (error?.response?.body) {
      console.error("[SendGrid] Response body:", JSON.stringify(error.response.body));
    }
    return false;
  }
}

/**
 * Send email to multiple recipients
 */
export async function sendEmailToMultiple(
  recipients: string[],
  subject: string,
  html: string,
  from?: string
): Promise<boolean> {
  try {
    if (!SENDGRID_API_KEY) {
      console.warn("[SendGrid] API key not configured. Email not sent.");
      return false;
    }

    const msg = {
      to: recipients,
      from: from || "kaique.studiolaser@gmail.com",
      replyTo: "kaique.studiolaser@gmail.com",
      subject,
      html,
    };

    await sgMail.sendMultiple(msg);
    console.log(`[SendGrid] Email sent successfully to ${recipients.length} recipients`);
    return true;
  } catch (error: any) {
    console.error("[SendGrid] Error sending email to multiple recipients:", error?.message || error);
    if (error?.response?.body) {
      console.error("[SendGrid] Response body:", JSON.stringify(error.response.body));
    }
    return false;
  }
}

/**
 * Send email with multiple attachments (PDF + Excel)
 */
export async function sendEmailWithAttachments(
  recipients: string[],
  subject: string,
  html: string,
  attachments: EmailAttachment[],
  from?: string
): Promise<boolean> {
  try {
    if (!SENDGRID_API_KEY) {
      console.warn("[SendGrid] API key not configured. Email not sent.");
      return false;
    }

    const sgAttachments = attachments
      .filter(a => a.content && a.content.length > 0)
      .map(a => {
        console.log(`[SendGrid] Processing attachment: ${a.filename} (${a.content.length} bytes, ${a.contentType})`);
        return {
          filename: a.filename,
          content: a.content.toString("base64"),
          type: a.contentType,
          disposition: "attachment" as const,
        };
      });
    console.log(`[SendGrid] Total attachments to send: ${sgAttachments.length}`);

    const msg: any = {
      to: recipients,
      from: from || "kaique.studiolaser@gmail.com",
      replyTo: "kaique.studiolaser@gmail.com",
      subject,
      html,
      attachments: sgAttachments.length > 0 ? sgAttachments : undefined,
    };

    console.log(`[SendGrid] Sending email with payload: recipients=${recipients.length}, attachments=${sgAttachments.length}, subject="${subject.substring(0, 50)}..."`);
    await sgMail.sendMultiple(msg);
    console.log(`[SendGrid] Email with ${sgAttachments.length} attachment(s) sent to ${recipients.length} recipients`);
    return true;
  } catch (error: any) {
    console.error("[SendGrid] Error sending email with attachments:", error?.message || error);
    if (error?.response?.body) {
      console.error("[SendGrid] Response body:", JSON.stringify(error.response.body));
    }
    return false;
  }
}

/**
 * Send email to multiple recipients with PDF attachment (legacy - kept for compatibility)
 */
export async function sendEmailWithPDFAttachment(
  recipients: string[],
  subject: string,
  html: string,
  pdfAttachment: EmailAttachment | null,
  from?: string
): Promise<boolean> {
  const attachments = pdfAttachment ? [pdfAttachment] : [];
  return sendEmailWithAttachments(recipients, subject, html, attachments, from);
}
