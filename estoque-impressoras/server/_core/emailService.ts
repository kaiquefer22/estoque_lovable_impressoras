import sgMail from "@sendgrid/mail";

let emailServiceReady = false;
const FROM_EMAIL = "kaique.studiolaser@gmail.com";

/**
 * Inicializa o serviço de email usando SendGrid
 */
export async function initializeEmailService() {
  const apiKey = process.env.SENDGRID_API_KEY;

  if (!apiKey) {
    console.warn("[Email] SendGrid API key not configured. Password reset emails will not be sent.");
    return;
  }

  sgMail.setApiKey(apiKey);
  emailServiceReady = true;
  console.log("[Email] Email service initialized with SendGrid");
}

/**
 * Envia email de reset de senha via SendGrid
 */
export async function sendPasswordResetEmail(
  recipientEmail: string,
  resetToken: string,
  appUrl: string = "http://localhost:3000"
): Promise<boolean> {
  if (!emailServiceReady) {
    console.warn("[Email] Email service not available. Cannot send password reset email.");
    return false;
  }

  try {
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

    const msg = {
      to: recipientEmail,
      from: FROM_EMAIL,
      subject: "Redefinir Senha - StudioLaser Estoque",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
            <h2 style="color: #7c3aed; margin-top: 0;">StudioLaser - Redefinir Senha</h2>
            
            <p style="color: #666; font-size: 14px;">
              Recebemos uma solicitação para redefinir a senha da sua conta no sistema de Estoque de Impressoras.
            </p>
            
            <p style="color: #666; font-size: 14px;">
              Clique no botão abaixo para redefinir sua senha:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Redefinir Senha
              </a>
            </div>
            
            <p style="color: #666; font-size: 12px;">
              Ou copie e cole este link no seu navegador:
            </p>
            <p style="color: #7c3aed; font-size: 12px; word-break: break-all;">
              ${resetUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="color: #999; font-size: 12px;">
              Este link de reset expira em 48 horas.
            </p>
            
            <p style="color: #999; font-size: 12px;">
              Se você não solicitou uma redefinição de senha, ignore este email ou entre em contato com o administrador.
            </p>
          </div>
        </div>
      `,
      text: `Redefinir Senha\n\nRecebemos uma solicitação para redefinir a senha da sua conta.\n\nClique no link: ${resetUrl}\n\nEste link expira em 48 horas.\n\nSe você não solicitou, ignore este email.`,
    };

    await sgMail.send(msg);
    console.log("[Email] Password reset email sent successfully to:", recipientEmail);
    return true;
  } catch (error: any) {
    console.error("[Email] Failed to send password reset email:", error?.message || error);
    if (error?.response?.body) {
      console.error("[Email] SendGrid response:", JSON.stringify(error.response.body));
    }
    return false;
  }
}

/**
 * Envia email de boas-vindas para novo usuário via SendGrid
 */
export async function sendWelcomeEmail(
  recipientEmail: string,
  userName: string,
  loginUrl: string = "http://localhost:3000/login"
): Promise<boolean> {
  if (!emailServiceReady) {
    console.warn("[Email] Email service not available. Cannot send welcome email.");
    return false;
  }

  try {
    const msg = {
      to: recipientEmail,
      from: FROM_EMAIL,
      subject: "Bem-vindo ao StudioLaser Estoque",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
            <h2 style="color: #7c3aed; margin-top: 0;">Bem-vindo, ${userName}!</h2>
            
            <p style="color: #666; font-size: 14px;">
              Sua conta foi criada com sucesso no sistema de Estoque de Impressoras.
            </p>
            
            <p style="color: #666; font-size: 14px;">
              Clique no botão abaixo para fazer login:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Fazer Login
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="color: #999; font-size: 12px;">
              Se você tiver dúvidas, entre em contato com o administrador do sistema.
            </p>
          </div>
        </div>
      `,
      text: `Bem-vindo, ${userName}!\n\nSua conta foi criada com sucesso.\n\nAcesse: ${loginUrl}`,
    };

    await sgMail.send(msg);
    console.log("[Email] Welcome email sent successfully to:", recipientEmail);
    return true;
  } catch (error: any) {
    console.error("[Email] Failed to send welcome email:", error?.message || error);
    if (error?.response?.body) {
      console.error("[Email] SendGrid response:", JSON.stringify(error.response.body));
    }
    return false;
  }
}

/**
 * Envia email genérico via SendGrid
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<boolean> {
  if (!emailServiceReady) {
    console.warn("[Email] Email service not available. Cannot send email.");
    return false;
  }

  try {
    const msg = {
      to,
      from: FROM_EMAIL,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    };

    await sgMail.send(msg);
    console.log("[Email] Email sent successfully to:", to);
    return true;
  } catch (error: any) {
    console.error("[Email] Failed to send email:", error?.message || error);
    if (error?.response?.body) {
      console.error("[Email] SendGrid response:", JSON.stringify(error.response.body));
    }
    return false;
  }
}
