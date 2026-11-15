import { env } from './env.js';

export class EmailDeliveryError extends Error {
  constructor(code, status = null) {
    super(code);
    this.name = 'EmailDeliveryError';
    this.code = code;
    this.status = status;
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

export async function sendPasswordResetEmail(to, resetUrl) {
  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL) {
    throw new EmailDeliveryError('BREVO_NOT_CONFIGURED');
  }

  let response;
  try {
    response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
        to: [{ email: to }],
        subject: 'Reset your E-Index password',
        textContent: `Use this link to reset your E-Index password. It expires in 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
        htmlContent: `<p>Use the link below to reset your E-Index password. It expires in 30 minutes.</p><p><a href="${escapeHtml(resetUrl)}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`
      })
    });
  } catch {
    throw new EmailDeliveryError('BREVO_NETWORK_ERROR');
  }

  try {
    await response.arrayBuffer();
  } catch {
    throw new EmailDeliveryError('BREVO_NETWORK_ERROR');
  }
  if (!response.ok) throw new EmailDeliveryError('BREVO_REJECTED', response.status);
}
