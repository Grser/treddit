import "server-only";

import type { Transporter } from "nodemailer";

let transporterPromise: Promise<Transporter | null> | null = null;

function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const host = process.env.SMTP_HOST;
      const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
      if (!host || !port) {
        console.warn(
          "SMTP_HOST/SMTP_PORT no están configurados; se omite el envío real de correos de recuperación.",
        );
        return null;
      }

      let nodemailer: typeof import("nodemailer").default;
      try {
        ({ default: nodemailer } = await import("nodemailer"));
      } catch (error) {
        console.error("Nodemailer no está instalado o no pudo cargarse", error);
        throw new Error(
          "No se pudo cargar Nodemailer. Asegúrate de tener la dependencia instalada en el entorno de ejecución.",
        );
      }
      const secureEnv = process.env.SMTP_SECURE;
      const secure = secureEnv ? secureEnv === "true" || secureEnv === "1" : port === 465;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      try {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: user && pass ? { user, pass } : undefined,
        });

        await transporter.verify();
        return transporter;
      } catch (error) {
        transporterPromise = null;
        console.error("No se pudo verificar la conexión SMTP", error);
        throw new Error("No se pudo conectar al servidor SMTP para enviar correos.");
      }
    })();
  }
  return transporterPromise;
}

export async function sendPasswordResetEmail(to: string, code: string) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.info(
      `Correo de recuperación omitido. Código para ${to}: ${code} (esto solo se registra porque falta configuración SMTP).`,
    );
    return;
  }
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
