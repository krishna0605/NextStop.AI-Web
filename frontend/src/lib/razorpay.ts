import crypto from "node:crypto";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Missing Razorpay credentials. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }

  return { keyId, keySecret };
}

function getBasicAuthHeader() {
  const { keyId, keySecret } = getRazorpayCredentials();
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export async function razorpayRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${RAZORPAY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json();

  if (!response.ok) {
    const message =
      payload?.error?.description ??
      payload?.error?.reason ??
      "Razorpay API request failed.";
    throw new Error(message);
  }

  return payload as T;
}

export function verifySubscriptionCheckoutSignature(params: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}) {
  const { keySecret } = getRazorpayCredentials();
  const digest = crypto
    .createHmac("sha256", keySecret)
    .update(`${params.paymentId}|${params.subscriptionId}`)
    .digest("hex");

  return digest === params.signature;
}

export function verifyWebhookSignature(body: string, signature: string) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Missing Razorpay webhook secret. Set RAZORPAY_WEBHOOK_SECRET.");
  }

  const digest = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  return digest === signature;
}

export function toIsoFromUnixSeconds(value: number | null | undefined) {
  if (!value) {
    return null;
  }

  return new Date(value * 1000).toISOString();
}

