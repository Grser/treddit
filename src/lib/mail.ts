import "server-only";

import { access } from "node:fs/promises";
import type { Transporter } from "nodemailer";

let transporterPromise: Promise<Transporter | null> | null = null;
let shellAvailabilityPromise: Promise<boolean> | null = null;

function isMissingShellError(error: unknown) {
  if (error instanceof Error && /spawn\s+\/bin\/sh\s+ENOENT/i.test(error.message)) {
    return true;
  }
  if (typeof error !== "object" || !error) {
    return false;
  }
  const maybeCode = "code" in error ? error.code : undefined;
  const maybePath = "path" in error ? error.path : undefined;
  return maybeCode === "ENOENT" && maybePath === "/bin/sh";
}

async function hasSystemShell() {
  if (!shellAvailabilityPromise) {
    shellAvailabilityPromise = access("/bin/sh")
      .then(() => true)
      .catch(() => false);
  }
  return shellAvailabilityPromise;
}

function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      if (!(await hasSystemShell())) {
        console.warn("El entorno no incluye /bin/sh; se omite el envío real de correos.");
        return null;
      }

      const host = process.env.SMTP_HOST;
      const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
      if (!host || !port) {
        console.warn(
          "SMTP_HOST/SMTP_PORT no están configurados; se omite el envío real de correos de recuperación.",
        );
        return null;
      }

      const nodemailer = (await import("nodemailer")) as typeof import("nodemailer");
      const secureEnv = process.env.SMTP_SECURE;
      const secure = secureEnv ? secureEnv === "true" || secureEnv === "1" : port === 465;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      try {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          // Some minimal/distroless environments do not ship a shell.
          // Keep this strictly on SMTP transport and never shell out.
          sendmail: false,
          direct: false,
          auth: user && pass ? { user, pass } : undefined,
        });

        await transporter.verify();
        return transporter;
      } catch (error) {
        if (isMissingShellError(error)) {
          transporterPromise = null;
          console.warn(
            "El entorno no tiene /bin/sh disponible; se desactiva temporalmente el envío de correo.",
          );
          return null;
        }
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

  try {
    await transporter.sendMail({ to, from, subject, text, html });
  } catch (error) {
    if (isMissingShellError(error)) {
      console.warn("No se pudo enviar el correo porque /bin/sh no existe en este entorno.");
      return;
    }
    throw error;
  }
}
