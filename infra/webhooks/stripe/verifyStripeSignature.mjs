import crypto from "node:crypto";

function parseStripeSignatureHeader(headerValue) {
  const map = {};
  String(headerValue || "")
    .split(",")
    .map((part) => part.trim())
    .forEach((entry) => {
      const [key, value] = entry.split("=");
      if (!key || !value) {
        return;
      }
      map[key] = value;
    });

  return {
    timestamp: map.t ? Number(map.t) : null,
    signatureV1: map.v1 || null
  };
}

export function verifyStripeSignature({
  rawBody,
  signatureHeader,
  webhookSecret,
  toleranceSeconds = 300
}) {
  if (!rawBody || !signatureHeader || !webhookSecret) {
    return {
      ok: false,
      error: "Missing body, Stripe signature header, or webhook secret."
    };
  }

  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed.timestamp || !parsed.signatureV1) {
    return {
      ok: false,
      error: "Invalid Stripe signature header format."
    };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - parsed.timestamp) > toleranceSeconds) {
    return {
      ok: false,
      error: "Stripe signature timestamp outside tolerance window."
    };
  }

  const signedPayload = `${parsed.timestamp}.${rawBody}`;
  const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(signedPayload, "utf8").digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(parsed.signatureV1, "hex");
  if (expectedBuffer.length !== receivedBuffer.length) {
    return {
      ok: false,
      error: "Stripe signature mismatch."
    };
  }

  const valid = crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  if (!valid) {
    return {
      ok: false,
      error: "Stripe signature mismatch."
    };
  }

  return {
    ok: true,
    timestamp: parsed.timestamp
  };
}
