import crypto from "node:crypto";

type CaptchaPayload = {
  id: string;
  answer: string;
  exp: number;
};

const CAPTCHA_TTL_SECONDS = 5 * 60;
const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || process.env.JWT_SECRET || "treddit-captcha-dev-secret";

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", CAPTCHA_SECRET).update(payload).digest("base64url");
}

export function createCaptchaChallenge() {
  const left = crypto.randomInt(1, 10);
  const right = crypto.randomInt(1, 10);
  const answer = String(left + right);
  const payload: CaptchaPayload = {
    id: crypto.randomUUID(),
    answer,
    exp: Math.floor(Date.now() / 1000) + CAPTCHA_TTL_SECONDS,
  };

  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = sign(encoded);
  return {
    question: `¿Cuánto es ${left} + ${right}?`,
    token: `${encoded}.${signature}`,
  };
}

export function verifyCaptchaToken(token: string, userAnswer: string) {
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [encoded, signature] = parts;
  const expectedSignature = sign(encoded);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(provided, expected)) return false;

  let payload: CaptchaPayload;
  try {
    payload = JSON.parse(fromBase64Url(encoded)) as CaptchaPayload;
  } catch {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) return false;

  return payload.answer === userAnswer.trim();
}
