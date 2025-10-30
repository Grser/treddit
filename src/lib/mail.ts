import nodemailer from "nodemailer";

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const host = process.env.SMTP_HOST;
      const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
      if (!host || !port) {
        throw new Error("SMTP_HOST and SMTP_PORT must be configured to enviar correos");
      }
      const secureEnv = process.env.SMTP_SECURE;
      const secure = secureEnv ? secureEnv === "true" || secureEnv === "1" : port === 465;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
      });

      await transporter.verify();
      return transporter;
    })();
  }
  return transporterPromise;
}

export async function sendPasswordResetEmail(to: string, code: string) {
  const transporter = await getTransporter();
  const appName = process.env.APP_NAME || "Treddit";
  const from =
    process.env.MAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    `no-reply@${(process.env.NEXT_PUBLIC_BASE_URL || "treddit.local").replace(/^https?:\/\//, "")}`;

  const subject = `${appName} - Código de recuperación`;
  const text = `Tu código de recuperación es ${code}. Caduca en 15 minutos.`;
  const html = `
    <p>Hola,</p>
    <p>Recibimos una solicitud para restablecer tu contraseña en <strong>${appName}</strong>.</p>
    <p>Tu código de verificación es:</p>
    <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
    <p>Este código caduca en 15 minutos. Si no solicitaste este cambio, puedes ignorar este correo.</p>
  `;

  await transporter.sendMail({ to, from, subject, text, html });
}
